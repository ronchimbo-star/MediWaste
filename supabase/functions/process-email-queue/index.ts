import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Queue-Secret",
};

const BATCH_SIZE = 20;
const STALE_SENDING_MINUTES = 10;

type QueueRow = {
  id: string;
  to_email: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  subject: string;
  html: string;
  status: string;
  attempts: number;
  max_attempts: number;
  updated_at: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function retryDelayMinutes(attempt: number) {
  return 2 ** attempt;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: authorised, error: authError } = await supabase.rpc(
      "email_queue_secret_matches",
      { p_secret: req.headers.get("x-queue-secret") }
    );
    if (authError) throw new Error(`Secret check failed: ${authError.message}`);
    if (authorised !== true) return jsonResponse({ error: "Unauthorised" }, 401);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Resend API key not configured");

    const now = new Date();
    const staleCutoff = new Date(now.getTime() - STALE_SENDING_MINUTES * 60_000).toISOString();

    const { data: dueRows, error: dueError } = await supabase
      .from("email_queue")
      .select("id, to_email, from_name, from_email, reply_to, subject, html, status, attempts, max_attempts, updated_at")
      .or(
        `and(status.eq.queued,next_attempt_at.lte.${now.toISOString()}),and(status.eq.sending,updated_at.lt.${staleCutoff})`
      )
      .order("next_attempt_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (dueError) throw new Error(`Could not read email queue: ${dueError.message}`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of (dueRows ?? []) as QueueRow[]) {
      const attempt = row.attempts + 1;

      const { data: claimed, error: claimError } = await supabase
        .from("email_queue")
        .update({ status: "sending", attempts: attempt, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("updated_at", row.updated_at)
        .select("id");
      if (claimError) throw new Error(`Could not claim email ${row.id}: ${claimError.message}`);
      if (!claimed?.length) {
        skipped++;
        continue;
      }

      let outcome: "sent" | "failed";
      let providerMessageId: string | null = null;
      let errorText: string | null = null;

      try {
        const sendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
            "Idempotency-Key": `${row.id}-${attempt}`,
          },
          body: JSON.stringify({
            from: `${row.from_name} <${row.from_email}>`,
            to: [row.to_email],
            subject: row.subject,
            html: row.html,
            ...(row.reply_to ? { reply_to: row.reply_to } : {}),
          }),
        });

        if (sendResponse.ok) {
          const result = await sendResponse.json();
          providerMessageId = typeof result?.id === "string" ? result.id : null;
          outcome = "sent";
        } else {
          errorText = `Resend ${sendResponse.status}: ${(await sendResponse.text()).slice(0, 400)}`;
          outcome = "failed";
        }
      } catch (err) {
        errorText = err instanceof Error ? err.message.slice(0, 400) : "Network error";
        outcome = "failed";
      }

      if (outcome === "sent") {
        sent++;
        const { error: updateError } = await supabase
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: providerMessageId,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updateError) throw new Error(`Could not mark email ${row.id} sent: ${updateError.message}`);
      } else {
        failed++;
        const giveUp = attempt >= row.max_attempts;
        const { error: updateError } = await supabase
          .from("email_queue")
          .update({
            status: giveUp ? "failed" : "queued",
            next_attempt_at: giveUp
              ? new Date().toISOString()
              : new Date(Date.now() + retryDelayMinutes(attempt) * 60_000).toISOString(),
            last_error: errorText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updateError) throw new Error(`Could not record failure for ${row.id}: ${updateError.message}`);
      }

      const { error: logError } = await supabase.from("email_send_log").insert({
        queue_id: row.id,
        attempt,
        outcome,
        provider: "resend",
        provider_message_id: providerMessageId,
        error: errorText,
      });
      if (logError) console.error(`Send log write failed for ${row.id}: ${logError.message}`);
    }

    return jsonResponse({ processed: dueRows?.length ?? 0, sent, failed, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
