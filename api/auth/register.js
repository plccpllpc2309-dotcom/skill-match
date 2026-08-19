import { query } from '../_lib/db.js';
import { hashPassword, signToken, setAuthCookie, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { name, email, password, year, category } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'weak_password' });
  }
  const existing = await query('select id from users where email = $1', [email.toLowerCase().trim()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'email_taken' });
  }
  const hash = await hashPassword(password);
  const { rows } = await query(
    `insert into users (name, email, password_hash, year, category)
     values ($1, $2, $3, $4, $5)
     returning id, name, email, year, category`,
    [name.trim(), email.toLowerCase().trim(), hash, year || 1, category || 'khac']
  );
  const user = rows[0];
  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.status(201).json({ user });
});
