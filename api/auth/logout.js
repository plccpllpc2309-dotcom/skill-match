import { clearAuthCookie, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
});
