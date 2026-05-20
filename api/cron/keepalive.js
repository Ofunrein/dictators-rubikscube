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

  const resp = await fetch(`${url}/rest/v1/users?limit=0`, {
    method: 'GET',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  });

  return res.status(200).json({ ok: true, status: resp.status });
}
