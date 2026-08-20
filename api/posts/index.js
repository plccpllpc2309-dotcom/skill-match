import { query, withTransaction } from '../_lib/db.js';
import { requireAuth, withCors } from '../_lib/auth.js';

const VALID_CATEGORIES = new Set(['dien', 'cntt', 'cokhi', 'khac']);

async function userBrief(id) {
  const u = await query('select id, name, year, category from users where id = $1', [id]);
  if (!u.rows[0]) return null;
  const reviews = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [id]);
  return { ...u.rows[0], reviews: reviews.rows };
}

async function serializePost(p) {
  const members = await query(
    `select u.id, u.name, u.year, u.category from post_members pm
     join users u on u.id = pm.user_id where pm.post_id = $1 order by pm.joined_at`,
    [p.id]
  );
  const requests = await query(
    `select u.id, u.name, u.year, u.category from join_requests jr
     join users u on u.id = jr.user_id where jr.post_id = $1 order by jr.requested_at`,
    [p.id]
  );
  const owner = await userBrief(p.owner_id);

  async function withRep(list) {
    const out = [];
    for (const u of list) {
      const rv = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [u.id]);
      out.push({ ...u, reviews: rv.rows });
    }
    return out;
  }

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    skillsNeeded: p.skills_needed,
    ownerId: p.owner_id,
    owner,
    members: await withRep(members.rows),
    joinRequests: await withRep(requests.rows),
    slots: p.slots,
    status: p.status,
    createdAt: p.created_at,
  };
}

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;

  if (req.method === 'GET') {
    const { rows } = await query('select * from posts order by created_at desc');
    const posts = [];
    for (const p of rows) posts.push(await serializePost(p));
    return res.status(200).json({ posts });
  }

  if (req.method === 'POST') {
    const { title, description, category, skillsNeeded, slots } = req.body || {};
    if (!title || !String(title).trim() || !description || !String(description).trim()) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (category !== undefined && !VALID_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'invalid_category' });
    }
    if (skillsNeeded !== undefined && (!Array.isArray(skillsNeeded) || skillsNeeded.length > 20 || skillsNeeded.some((s) => typeof s !== 'string' || !s.trim() || s.trim().length > 50))) {
      return res.status(400).json({ error: 'invalid_skills' });
    }

    const normalizedSkills = [...new Set((skillsNeeded || []).map((s) => s.trim()).filter(Boolean))];
    const normalizedSlots = Number(slots);
    const safeSlots = Number.isFinite(normalizedSlots) ? Math.min(6, Math.max(1, Math.floor(normalizedSlots))) : 2;

    const post = await withTransaction(async (client) => {
      const postRes = await client.query(
        `insert into posts (title, description, category, skills_needed, owner_id, slots, status)
         values ($1, $2, $3, $4, $5, $6, 'open') returning *`,
        [String(title).trim(), String(description).trim(), category || 'khac', normalizedSkills, me.id, safeSlots]
      );
      const created = postRes.rows[0];
      await client.query('insert into post_members (post_id, user_id) values ($1, $2)', [created.id, me.id]);
      return created;
    });

    const serialized = await serializePost(post);
    return res.status(201).json({ post: serialized });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
});
