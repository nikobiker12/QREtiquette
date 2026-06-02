export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  try {
    const url = new URL(request.url);
    const uidFromQuery = url.searchParams.get('uid') || undefined;

    // Build payload: prefer JSON body for POST, fallback to minimal payload
    let payload = { timestamp: Date.now() };
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        payload = Object.assign(payload, body || {});
      } catch (e) {
        // ignore body parse errors, keep minimal payload
        console.error('notify: invalid JSON body', e);
      }
    }

    if (uidFromQuery && !payload.uid) payload.uid = uidFromQuery;

    // Prefer Home Assistant webhook env var, fallback to NOTIFY_WEBHOOK
    const webhookUrl = env.HA_WEBHOOK_URL || env.NOTIFY_WEBHOOK;

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (forwardErr) {
        // Log forwarding errors server-side but remain silent for the client
        console.error('notify: forward error', forwardErr);
      }
    } else {
      console.error('notify: no webhook configured (HA_WEBHOOK_URL or NOTIFY_WEBHOOK)');
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error('notify: handler error', err);
    return new Response(JSON.stringify({ ok: false }), { status: 200, headers });
  }
}
