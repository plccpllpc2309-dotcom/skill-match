const STYLE_ID = 'skillmatch-project-viewer-style';
const MODAL_ID = 'skillmatch-project-viewer';
const bound = new WeakSet();
let posts = [];

function esc(v) { return String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
function stars(v) { const n = Number(v) || 0; return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`; }
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style'); s.id = STYLE_ID;
  s.textContent = `#${MODAL_ID}{position:fixed;inset:0;z-index:9999;background:rgba(28,25,23,.55);display:flex;align-items:center;justify-content:center;padding:16px}#${MODAL_ID} .sm-pr-card{background:#fff;border-radius:14px;width:min(680px,100%);max-height:88vh;overflow:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}#${MODAL_ID} .sm-pr-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px}#${MODAL_ID} .sm-pr-close{border:0;background:#f5f5f4;border-radius:8px;padding:6px;cursor:pointer}#${MODAL_ID} .sm-pr-member{border:1px solid #f0efec;border-radius:10px;margin:10px 0;overflow:hidden}#${MODAL_ID} .sm-pr-member-head{padding:11px 12px;background:#fafaf9;font-weight:600}#${MODAL_ID} .sm-pr-review{padding:12px;border-top:1px solid #f0efec}#${MODAL_ID} .sm-pr-scores{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}#${MODAL_ID} .sm-pr-score{background:#fafaf9;border-radius:8px;padding:8px;font-size:12px}#${MODAL_ID} .sm-pr-stars{color:#d97706;letter-spacing:1px;font-size:15px}#${MODAL_ID} .sm-pr-comment{margin-top:9px;padding:9px;border-radius:8px;background:#f5f5f4;color:#57534e;font-size:13px}#${MODAL_ID} .sm-pr-empty{padding:14px;background:#fafaf9;border-radius:9px;color:#78716c;font-size:13px}`;
  document.head.appendChild(s);
}
function openModal(postId) {
  injectStyle();
  let m = document.getElementById(MODAL_ID);
  if (!m) { m = document.createElement('div'); m.id = MODAL_ID; document.body.appendChild(m); }
  m.innerHTML = `<div class="sm-pr-card"><div class="sm-pr-head"><div><div style="font-size:12px;color:#a8a29e">Chi tiết dự án & đánh giá</div><h2 style="margin:3px 0;font-size:20px">Đang tải...</h2></div><button class="sm-pr-close" data-sm-close>✕</button></div><div class="sm-pr-empty">Đang tải nội dung review...</div></div>`;
  m.onclick = (e) => { if (e.target === m || e.target.closest('[data-sm-close]')) m.remove(); };
  fetch(`/api/posts/${postId}/reviews`, { credentials:'include' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'request_failed'); return d; }).then((d) => {
    m.querySelector('h2').textContent = d.post.title;
    const body = m.querySelector('.sm-pr-empty'); body.className = '';
    const all = d.reviewDetails || [];
    body.innerHTML = `<div style="font-size:13px;color:#57534e;margin-bottom:14px">${esc(d.post.description || '')}</div>${(d.members || []).map((u) => { const rs = all.filter((r) => String(r.target_user_id) === String(u.id)); return `<div class="sm-pr-member"><div class="sm-pr-member-head">${esc(u.name)} <span style="font-size:11px;color:#a8a29e;font-weight:400">· ${rs.length} đánh giá</span></div>${rs.length ? rs.map((r) => `<div class="sm-pr-review"><div style="font-size:13px;font-weight:600">${esc(r.reviewer_name)}</div><div class="sm-pr-scores"><div class="sm-pr-score">Đóng góp<br><span class="sm-pr-stars">${stars(r.contribution)}</span> ${r.contribution}/5</div><div class="sm-pr-score">Chất lượng<br><span class="sm-pr-stars">${stars(r.skill)}</span> ${r.skill}/5</div><div class="sm-pr-score">Trách nhiệm<br><span class="sm-pr-stars">${stars(r.punctual)}</span> ${r.punctual}/5</div></div>${r.comment ? `<div class="sm-pr-comment">“${esc(r.comment)}”</div>` : ''}</div>`).join('') : `<div class="sm-pr-empty">Chưa có đánh giá cho thành viên này.</div>`}</div>`; }).join('')}`;
  }).catch((e) => { m.querySelector('.sm-pr-empty').innerHTML = `Không thể tải review của dự án (${esc(e.message)}).`; });
}
function bind() {
  const titleMap = new Map(posts.map((p) => [String(p.title).trim(), p.id]));
  document.querySelectorAll('[data-project-id]').forEach((el) => { if (!bound.has(el)) { bound.add(el); el.addEventListener('click', () => openModal(el.dataset.projectId)); } });
  if (!titleMap.size) return;
  document.querySelectorAll('h2,h3,button,div,span').forEach((el) => {
    if (bound.has(el) || el.children.length > 0) return;
    const id = titleMap.get(el.textContent.trim());
    if (!id) return;
    bound.add(el); el.style.cursor = 'pointer'; el.title = 'Xem chi tiết dự án & review'; el.addEventListener('click', (e) => { e.stopPropagation(); openModal(id); });
  });
}
async function loadPosts() {
  try { const r = await fetch('/api/posts', { credentials:'include' }); const d = await r.json(); posts = d.posts || []; bind(); } catch {}
}
if (typeof window !== 'undefined') {
  window.addEventListener('skillmatch:project-ready', bind);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadPosts); else loadPosts();
  new MutationObserver(bind).observe(document.body, { childList:true, subtree:true });
}
