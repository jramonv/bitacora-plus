import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// HMAC signature generation
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Delivery function with retries
async function deliverWebhook(
  url: string,
  payload: any,
  secret: string,
  eventType: string,
  eventId: string
): Promise<{ success: boolean; httpCode?: number; error?: string; latency: number }> {
  const startTime = Date.now();
  
  try {
    const body = JSON.stringify(payload);
    const signature = await generateSignature(body, secret);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': eventType,
        'X-Event-Id': eventId,
        'X-Signature': `sha256=${signature}`,
        'User-Agent': 'Bitacora-Webhook/1.0'
      },
      body,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { success: true, httpCode: response.status, latency };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { 
        success: false, 
        httpCode: response.status, 
        error: `HTTP ${response.status}: ${errorText}`,
        latency 
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return { 
      success: false, 
      error: error.message || 'Network error',
      latency 
    };
  }
}

// Calculate next retry delay (exponential backoff)
function getNextRetryDelay(attempts: number): number {
  const delays = [60, 300, 1800, 10800, 86400]; // 1m, 5m, 30m, 3h, 24h
  return delays[Math.min(attempts, delays.length - 1)] * 1000; // Convert to milliseconds
}

serve(async (req: Request) => {
  console.log('🚀 Webhook delivery service starting...');
  
  try {
    // Get pending events that are due for delivery
    const { data: events, error: eventsError } = await supabase
      .from('event_outbox')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .lt('attempts', 7)
      .order('created_at')
      .limit(50);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch events' }), { status: 500 });
    }

    if (!events || events.length === 0) {
      console.log('No pending events to process');
      return new Response(JSON.stringify({ message: 'No pending events', processed: 0 }), { status: 200 });
    }

    console.log(`📋 Processing ${events.length} events...`);
    let processedCount = 0;
    let successCount = 0;

    for (const event of events) {
      try {
        // Get active webhook subscriptions for this tenant and event type
        const { data: subscriptions, error: subsError } = await supabase
          .from('webhook_subscriptions')
          .select('*')
          .eq('tenant_id', event.tenant_id)
          .eq('active', true)
          .contains('events', [event.event_type]);

        if (subsError) {
          console.error(`Error fetching subscriptions for event ${event.id}:`, subsError);
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          // No subscriptions for this event type, mark as delivered
          await supabase
            .from('event_outbox')
            .update({ status: 'delivered' })
            .eq('id', event.id);
          
          processedCount++;
          successCount++;
          continue;
        }

        let eventDelivered = false;

        // Deliver to each subscription
        for (const subscription of subscriptions) {
          console.log(`📤 Delivering event ${event.event_type} to ${subscription.url}`);
          
          const result = await deliverWebhook(
            subscription.url,
            event.payload,
            subscription.secret,
            event.event_type,
            event.id
          );

          // Log delivery attempt
          await supabase.from('webhook_delivery_logs').insert({
            subscription_id: subscription.id,
            status: result.success ? 'success' : 'failed',
            http_code: result.httpCode,
            latency_ms: result.latency,
            error: result.error
          });

          if (result.success) {
            console.log(`✅ Successfully delivered to ${subscription.url}`);
            eventDelivered = true;
          } else {
            console.log(`❌ Failed to deliver to ${subscription.url}: ${result.error}`);
          }
        }

        // Update event status
        if (eventDelivered) {
          await supabase
            .from('event_outbox')
            .update({ status: 'delivered' })
            .eq('id', event.id);
          successCount++;
        } else {
          // All deliveries failed, schedule retry
          const nextAttempt = new Date(Date.now() + getNextRetryDelay(event.attempts));
          
          if (event.attempts >= 6) {
            // Max attempts reached, mark as failed
            await supabase
              .from('event_outbox')
              .update({ status: 'failed' })
              .eq('id', event.id);
          } else {
            // Schedule retry
            await supabase
              .from('event_outbox')
              .update({
                attempts: event.attempts + 1,
                next_attempt_at: nextAttempt.toISOString()
              })
              .eq('id', event.id);
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
      }
    }

    console.log(`✨ Processed ${processedCount} events, ${successCount} delivered successfully`);
    
    return new Response(JSON.stringify({
      message: 'Webhook delivery completed',
      processed: processedCount,
      successful: successCount,
      failed: processedCount - successCount
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Fatal error in webhook delivery:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});