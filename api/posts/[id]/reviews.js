import { query } from '../../_lib/db.js';
import { requireAuth, withCors } from '../../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { id, targetUserId } = req.query;

  const postRes = await query(
    'select id, title, description, category, skills_needed, status, owner_id from posts where id = $1',
    [id]
  );
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });

  const memberRes = await query(
    `select u.id, u.name, u.year, u.category
     from post_members pm
     join users u on u.id = pm.user_id
     where pm.post_id = $1
     order by pm.joined_at`,
    [id]
  );

  const members = memberRes.rows;
  const allParticipants = [
    { id: post.owner_id, name: null, year: null, category: null, isOwner: true },
    ...members.map((m) => ({ ...m, isOwner: false })),
  ];

  const ownerRes = await query(
    'select id, name, year, category from users where id = $1',
    [post.owner_id]
  );
  if (ownerRes.rows[0]) allParticipants[0] = { ...ownerRes.rows[0], isOwner: true };

  if (targetUserId) {
    const target = allParticipants.find((m) => String(m.id) === String(targetUserId));
    if (!target) return res.status(400).json({ error: 'target_not_a_member' });

    const reviewsRes = await query(
      `select r.id, r.contribution, r.punctual, r.skill, r.comment, r.created_at,
              u.id as reviewer_id, u.name as reviewer_name
       from reviews r
       join users u on u.id = r.reviewer_id
       where r.post_id = $1 and r.target_user_id = $2
       order by r.created_at desc`,
      [id, targetUserId]
    );

    return res.status(200).json({
      post: {
        id: post.id, title: post.title, description: post.description,
        category: post.category, skillsNeeded: post.skills_needed,
        status: post.status, ownerId: post.owner_id,
      },
      target,
      reviews: reviewsRes.rows,
    });
  }

  const isParticipant = String(me.id) === String(post.owner_id) || members.some((m) => String(m.id) === String(me.id));
  if (!isParticipant) return res.status(403).json({ error: 'not_a_member' });

  const reviewsRes = await query(
    `select r.target_user_id, r.contribution, r.punctual, r.skill, r.comment,
            ru.id as reviewer_id, ru.name as reviewer_name,
            tu.name as target_name
     from reviews r
     join users ru on ru.id = r.reviewer_id
     join users tu on tu.id = r.target_user_id
     where r.post_id = $1
     order by tu.name, ru.name`,
    [id]
  );

  const mineRes = await query(
    'select target_user_id from reviews where post_id = $1 and reviewer_id = $2',
    [id, me.id]
  );

  return res.status(200).json({
    post: {
      id: post.id, title: post.title, description: post.description,
      category: post.category, skillsNeeded: post.skills_needed,
      status: post.status, ownerId: post.owner_id,
    },
    members,
    participants: allParticipants,
    myReviewTargetIds: mineRes.rows.map((r) => r.target_user_id),
    reviewDetails: reviewsRes.rows,
  });
});
