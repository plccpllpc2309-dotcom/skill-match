import { query } from './_lib/db.js';
import { requireAuth, withCors } from './_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;

  if (req.method === 'POST') {
    const { name, level } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'missing_name' });
    const lvl = Math.min(3, Math.max(1, Number(level) || 1));
    await query(
      `insert into skills (user_id, name, level) values ($1, $2, $3)
       on conflict (user_id, name) do update set level = excluded.level`,
      [me.id, name.trim(), lvl]
    );
    const skills = await query('select name, level from skills where user_id = $1 order by name', [me.id]);
    return res.status(200).json({ skills: skills.rows });
  }

  if (req.method === 'DELETE') {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'missing_name' });
    await query('delete from skills where user_id = $1 and name = $2', [me.id, name]);
    const skills = await query('select name, level from skills where user_id = $1 order by name', [me.id]);
    return res.status(200).json({ skills: skills.rows });
  }

  res.status(405).json({ error: 'method_not_allowed' });
});
