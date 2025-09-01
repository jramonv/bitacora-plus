import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskData {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  required_evidence: any
  ai_risk: number | null
  ai_flags: string[]
  subject: {
    id: string
    title: string
    status: string
  }
  evidence: Array<{
    id: string
    kind: string
    filename: string
    checksum: string | null
    latitude: number | null
    longitude: number | null
    created_at: string
  }>
  log_entries: Array<{
    id: string
    event_type: string
    message: string | null
    created_at: string
    metadata: any
  }>
  checklist_runs: Array<{
    id: string
    result: any
    completed_at: string | null
    checklist_templates: {
      name: string
      items: any[]
    }
  }>
}

interface TenantData {
  id: string
  name: string
  settings: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url)
    const taskId = url.pathname.split('/').pop()?.replace('.pdf', '')
    
    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    console.log(`Generating PDF for task: ${taskId}`)

    // Fetch task with all related data (RLS will automatically filter by tenant)
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        subjects (
          id,
          title,
          status
        ),
        evidence (
          id,
          kind,
          filename,
          checksum,
          latitude,
          longitude,
          created_at
        ),
        log_entries (
          id,
          event_type,
          message,
          created_at,
          metadata
        ),
        checklist_runs (
          id,
          result,
          completed_at,
          checklist_templates (
            name,
            items
          )
        )
      `)
      .eq('id', taskId)
      .single()

    if (taskError) {
      console.error('Error fetching task:', taskError)
      return new Response(
        JSON.stringify({ error: 'Task not found or access denied' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .single()

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
    }

    // Generate PDF
    const pdf = new jsPDF()
    
    // Header with tenant info
    pdf.setFontSize(20)
    pdf.text(tenant?.name || 'Bitácora + Cumplimiento', 20, 20)
    
    pdf.setFontSize(12)
    pdf.text(`Reporte de Tarea - ${new Date().toLocaleDateString('es-ES')}`, 20, 30)
    
    // Task basic info
    let yPosition = 50
    
    pdf.setFontSize(16)
    pdf.text('Información de la Tarea', 20, yPosition)
    yPosition += 10
    
    pdf.setFontSize(12)
    pdf.text(`ID: ${task.id}`, 20, yPosition)
    yPosition += 8
    
    pdf.text(`Título: ${task.title}`, 20, yPosition)
    yPosition += 8
    
    if (task.description) {
      pdf.text(`Descripción: ${task.description}`, 20, yPosition)
      yPosition += 8
    }
    
    pdf.text(`Estado: ${task.status}`, 20, yPosition)
    yPosition += 8
    
    pdf.text(`Proyecto: ${task.subjects?.title || 'N/A'}`, 20, yPosition)
    yPosition += 8
    
    if (task.due_date) {
      pdf.text(`Fecha límite: ${new Date(task.due_date).toLocaleDateString('es-ES')}`, 20, yPosition)
      yPosition += 8
    }
    
    if (task.completed_at) {
      pdf.text(`Completado: ${new Date(task.completed_at).toLocaleDateString('es-ES')}`, 20, yPosition)
      yPosition += 8
    }
    
    yPosition += 10
    
    // Required evidence section
    pdf.setFontSize(16)
    pdf.text('Evidencia Requerida', 20, yPosition)
    yPosition += 10
    
    pdf.setFontSize(12)
    const requiredEvidence = task.required_evidence || {}
    pdf.text(`Fotos mínimas: ${requiredEvidence.min_photos || 3}`, 20, yPosition)
    yPosition += 8
    
    pdf.text(`Geolocalización requerida: ${requiredEvidence.geotag_required ? 'Sí' : 'No'}`, 20, yPosition)
    yPosition += 8
    
    pdf.text(`Firma requerida: ${requiredEvidence.signature_required ? 'Sí' : 'No'}`, 20, yPosition)
    yPosition += 10
    
    // Evidence section
    if (task.evidence && task.evidence.length > 0) {
      pdf.setFontSize(16)
      pdf.text('Evidencias', 20, yPosition)
      yPosition += 10
      
      pdf.setFontSize(12)
      task.evidence.forEach((evidence: any, index: number) => {
        if (yPosition > 250) {
          pdf.addPage()
          yPosition = 20
        }
        
        pdf.text(`${index + 1}. ${evidence.filename} (${evidence.kind})`, 20, yPosition)
        yPosition += 6
        
        if (evidence.checksum) {
          pdf.text(`   Hash: ${evidence.checksum.substring(0, 16)}...`, 20, yPosition)
          yPosition += 6
        }
        
        if (evidence.latitude && evidence.longitude) {
          pdf.text(`   Ubicación: ${evidence.latitude.toFixed(6)}, ${evidence.longitude.toFixed(6)}`, 20, yPosition)
          yPosition += 6
        }
        
        pdf.text(`   Fecha: ${new Date(evidence.created_at).toLocaleDateString('es-ES')}`, 20, yPosition)
        yPosition += 8
      })
      
      yPosition += 5
    }
    
    // Checklist section
    if (task.checklist_runs && task.checklist_runs.length > 0) {
      if (yPosition > 200) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(16)
      pdf.text('Lista de Verificación', 20, yPosition)
      yPosition += 10
      
      task.checklist_runs.forEach((run: any) => {
        pdf.setFontSize(14)
        pdf.text(`${run.checklist_templates?.name || 'Lista sin nombre'}`, 20, yPosition)
        yPosition += 8
        
        pdf.setFontSize(12)
        pdf.text(`Estado: ${run.completed_at ? 'Completada' : 'Pendiente'}`, 20, yPosition)
        yPosition += 6
        
        if (run.completed_at) {
          pdf.text(`Fecha: ${new Date(run.completed_at).toLocaleDateString('es-ES')}`, 20, yPosition)
          yPosition += 6
        }
        
        yPosition += 5
      })
    }
    
    // Timeline section
    if (task.log_entries && task.log_entries.length > 0) {
      if (yPosition > 150) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(16)
      pdf.text('Timeline de Eventos', 20, yPosition)
      yPosition += 10
      
      pdf.setFontSize(12)
      const sortedLogs = task.log_entries.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      sortedLogs.forEach((log: any) => {
        if (yPosition > 270) {
          pdf.addPage()
          yPosition = 20
        }
        
        const date = new Date(log.created_at).toLocaleString('es-ES')
        pdf.text(`${date} - ${log.event_type}`, 20, yPosition)
        yPosition += 6
        
        if (log.message) {
          pdf.text(`  ${log.message}`, 20, yPosition)
          yPosition += 6
        }
        
        yPosition += 2
      })
    }
    
    // AI Risk section
    if (task.ai_risk !== null || (task.ai_flags && task.ai_flags.length > 0)) {
      if (yPosition > 200) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(16)
      pdf.text('Análisis de IA', 20, yPosition)
      yPosition += 10
      
      pdf.setFontSize(12)
      if (task.ai_risk !== null) {
        pdf.text(`Nivel de riesgo: ${(task.ai_risk * 100).toFixed(1)}%`, 20, yPosition)
        yPosition += 8
      }
      
      if (task.ai_flags && task.ai_flags.length > 0) {
        pdf.text('Alertas de cumplimiento:', 20, yPosition)
        yPosition += 6
        
        task.ai_flags.forEach((flag: string) => {
          pdf.text(`• ${flag}`, 25, yPosition)
          yPosition += 6
        })
      }
    }
    
    // Footer
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(10)
      pdf.text(`Página ${i} de ${pageCount}`, 20, 285)
      pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 150, 285)
    }
    
    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer')
    
    console.log(`PDF generated successfully for task ${taskId}`)
    
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="task-${taskId}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate PDF',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})