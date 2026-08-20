const BASE = '/api';

async function call(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'request_failed');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (body) => call('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => call('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => call('/auth/logout', { method: 'POST' }),
  me: () => call('/auth/me'),

  addSkill: (name, level) => call('/skills', { method: 'POST', body: JSON.stringify({ name, level }) }),
  removeSkill: (name) => call('/skills', { method: 'DELETE', body: JSON.stringify({ name }) }),

  listPosts: () => call('/posts'),
  createPost: (body) => call('/posts', { method: 'POST', body: JSON.stringify(body) }),
  postAction: (id, action, userId) =>
    call(`/posts/${id}/action`, { method: 'POST', body: JSON.stringify({ action, userId }) }),
  matchCandidates: (id) => call(`/posts/${id}/match`),

  submitReview: (body) => call('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  getProjectReviews: (id, targetUserId) => call(`/posts/${id}/reviews${targetUserId ? `?targetUserId=${targetUserId}` : ''}`),
  leaderboard: () => call('/users/leaderboard'),
  getUser: (id) => call(`/users/${id}`),
};
