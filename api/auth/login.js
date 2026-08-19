import { query } from '../_lib/db.js';
import { verifyPassword, signToken, setAuthCookie, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

  const { rows } = await query(
    'select id, name, email, year, category, password_hash from users where email = $1',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken(user.id);
  setAuthCookie(res, token);
  delete user.password_hash;
  res.status(200).json({ user });
});
