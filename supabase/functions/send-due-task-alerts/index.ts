import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskAlert {
  task_id: string
  title: string
  description: string | null
  due_at: string
  status: string
  assignee_email: string
  assignee_name: string | null
  subject_title: string
  deep_link: string
}

interface AlertPayload {
  tenant_id: string
  assignee_id: string
  assignee_email: string
  assignee_name: string | null
  due_tasks: TaskAlert[]
  overdue_tasks: TaskAlert[]
  alert_type: 'due_soon' | 'overdue' | 'mixed'
  timestamp: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting due task alerts job...')

    // Get all active tenants with webhook configurations
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('status', 'active')

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      throw tenantsError
    }

    console.log(`Found ${tenants?.length || 0} active tenants`)

    for (const tenant of tenants || []) {
      const settings = tenant.settings as any || {}
      const webhookUrl = settings.alert_webhook_url
      
      if (!webhookUrl) {
        console.log(`Tenant ${tenant.id} has no webhook URL configured, skipping...`)
        continue
      }

      console.log(`Processing alerts for tenant: ${tenant.name} (${tenant.id})`)

      // Get tasks due in next 24 hours or overdue
      const now = new Date()
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const { data: dueTasks, error: dueTasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          due_at,
          status,
          assignee_id,
          subject_id,
          subjects!inner(title),
          profiles!inner(email, display_name)
        `)
        .eq('tenant_id', tenant.id)
        .in('status', ['pending', 'in_progress'])
        .not('due_at', 'is', null)
        .lte('due_at', next24Hours.toISOString())

      const { data: overdueTasks, error: overdueTasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          due_at,
          status,
          assignee_id,
          subject_id,
          subjects!inner(title),
          profiles!inner(email, display_name)
        `)
        .eq('tenant_id', tenant.id)
        .in('status', ['pending', 'in_progress'])
        .not('due_at', 'is', null)
        .lt('due_at', now.toISOString())

      if (dueTasksError || overdueTasksError) {
        console.error('Error fetching tasks:', dueTasksError || overdueTasksError)
        continue
      }

      const allTasks = [...(dueTasks || []), ...(overdueTasks || [])]
      
      if (allTasks.length === 0) {
        console.log(`No due/overdue tasks found for tenant ${tenant.id}`)
        continue
      }

      // Group tasks by assignee
      const tasksByAssignee = new Map<string, any[]>()
      
      for (const task of allTasks) {
        if (!task.assignee_id) continue
        
        if (!tasksByAssignee.has(task.assignee_id)) {
          tasksByAssignee.set(task.assignee_id, [])
        }
        tasksByAssignee.get(task.assignee_id)!.push(task)
      }

      console.log(`Found tasks for ${tasksByAssignee.size} assignees in tenant ${tenant.id}`)

      // Send webhook for each assignee
      for (const [assigneeId, tasks] of tasksByAssignee) {
        if (tasks.length === 0) continue

        const assigneeInfo = tasks[0].profiles
        const baseUrl = settings.base_url || 'https://your-app.com'

        const dueTasks: TaskAlert[] = []
        const overdueTasks: TaskAlert[] = []

        for (const task of tasks) {
          const taskAlert: TaskAlert = {
            task_id: task.id,
            title: task.title,
            description: task.description,
            due_at: task.due_at,
            status: task.status,
            assignee_email: assigneeInfo.email,
            assignee_name: assigneeInfo.display_name,
            subject_title: task.subjects.title,
            deep_link: `${baseUrl}/tasks/${task.id}`
          }

          const taskDueDate = new Date(task.due_at)
          if (taskDueDate < now) {
            overdueTasks.push(taskAlert)
          } else {
            dueTasks.push(taskAlert)
          }
        }

        const alertType = overdueTasks.length > 0 
          ? (dueTasks.length > 0 ? 'mixed' : 'overdue')
          : 'due_soon'

        const payload: AlertPayload = {
          tenant_id: tenant.id,
          assignee_id: assigneeId,
          assignee_email: assigneeInfo.email,
          assignee_name: assigneeInfo.display_name,
          due_tasks: dueTasks,
          overdue_tasks: overdueTasks,
          alert_type: alertType,
          timestamp: now.toISOString()
        }

        try {
          console.log(`Sending webhook to ${webhookUrl} for assignee ${assigneeInfo.email}`)
          
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Bitacora-TaskAlerts/1.0'
            },
            body: JSON.stringify(payload)
          })

          if (!webhookResponse.ok) {
            console.error(`Webhook failed for ${assigneeInfo.email}: ${webhookResponse.status} ${webhookResponse.statusText}`)
          } else {
            console.log(`Webhook sent successfully to ${assigneeInfo.email}`)
          }

          // Log the alert
          await supabase
            .from('log_entries')
            .insert({
              tenant_id: tenant.id,
              event_type: 'alert_sent',
              description: `Task alert sent to ${assigneeInfo.email}`,
              metadata: {
                assignee_id: assigneeId,
                tasks_count: tasks.length,
                due_count: dueTasks.length,
                overdue_count: overdueTasks.length,
                webhook_url: webhookUrl,
                webhook_status: webhookResponse.status
              }
            })

        } catch (error) {
          console.error(`Error sending webhook for ${assigneeInfo.email}:`, error)
          
          // Log the error
          await supabase
            .from('log_entries')
            .insert({
              tenant_id: tenant.id,
              event_type: 'alert_failed',
              description: `Failed to send task alert to ${assigneeInfo.email}`,
              metadata: {
                assignee_id: assigneeId,
                error: error.message,
                webhook_url: webhookUrl
              }
            })
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log('Due task alerts job completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Task alerts processed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-due-task-alerts function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})