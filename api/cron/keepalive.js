export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers['authorization'];

  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  const resp = await fetch(`${url}/rest/v1/keepalive?id=eq.1`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      touched_at: new Date().toISOString(),
      source: 'vercel-cron',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return res.status(502).json({ error: text });
  }

  return res.status(200).json({ ok: true });
}
