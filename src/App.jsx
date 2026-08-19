import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Users, UserPlus, Check, X, Star, User, Trophy, Clock, Sparkles, LogOut } from 'lucide-react';
import { api } from './api';
import Auth from './Auth';

const CATEGORIES = [
  { id: 'dien', label: 'Điện / Điện tử / Nhúng', tw: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  { id: 'cntt', label: 'CNTT', tw: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#7c3aed' },
  { id: 'cokhi', label: 'Cơ khí / Tự động hóa', tw: 'bg-orange-50 text-orange-700 border-orange-200', dot: '#ea580c' },
  { id: 'khac', label: 'Khác', tw: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#64748b' },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[3];

const TIERS = [
  { min: 90, label: 'Kim Cương', hex: '#06b6d4' },
  { min: 70, label: 'Vàng', hex: '#f59e0b' },
  { min: 40, label: 'Bạc', hex: '#94a3b8' },
  { min: 0, label: 'Đồng', hex: '#9a3412' },
];
function tierOf(score) {
  if (score === null || score === undefined) return { label: 'Mới', hex: '#cbd5e1' };
  return TIERS.find((t) => score >= t.min);
}
function avgScore(reviews) {
  if (!reviews || reviews.length === 0) return null;
  const flat = reviews.flatMap((r) => [r.contribution, r.punctual, r.skill]);
  return Math.round((flat.reduce((a, b) => a + b, 0) / flat.length / 5) * 100);
}

function ReputationRing({ score, size = 72, stroke = 6, showLabel = true }) {
  const tier = tierOf(score);
  const pct = score === null || score === undefined ? 0 : score;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tier.hex} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: size * 0.24, color: '#1c1917' }}>
            {score === null || score === undefined ? '—' : score}
          </span>
        </div>
      </div>
      {showLabel && <span className="text-xs font-semibold mt-1" style={{ color: tier.hex }}>{tier.label}</span>}
    </div>
  );
}

function LevelDots({ level }) {
  return (
    <span className="inline-flex gap-0.5 align-middle ml-1">
      {[1, 2, 3].map((i) => (
        <span key={i} className="inline-block rounded-full" style={{ width: 5, height: 5, backgroundColor: i <= level ? '#0f766e' : '#e7e5e4' }} />
      ))}
    </span>
  );
}

function CategoryChip({ id }) {
  const cat = catById(id);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cat.tw}`}>
      <span className="inline-block rounded-full" style={{ width: 6, height: 6, backgroundColor: cat.dot }} />
      {cat.label}
    </span>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star size={20} color={n <= value ? '#f59e0b' : '#d6d3d1'} fill={n <= value ? '#f59e0b' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState(null);

  const [posts, setPosts] = useState([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [tab, setTab] = useState('explore');
  const [search, setSearch] = useState('');
  const [activeCats, setActiveCats] = useState(CATEGORIES.map((c) => c.id));
  const [banner, setBanner] = useState(null);

  const [newPost, setNewPost] = useState({ title: '', description: '', category: 'dien', skillsNeeded: [], slots: 2 });
  const [skillInput, setSkillInput] = useState('');
  const [newSkill, setNewSkill] = useState({ name: '', level: 2 });
  const [reviewState, setReviewState] = useState(null);
  const [matchPanel, setMatchPanel] = useState(null); // { postId, loading, suggestions }

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    api.me().then((r) => setMe(r.user)).catch(() => setMe(null)).finally(() => setAuthChecked(true));
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [p, l, m] = await Promise.all([api.listPosts(), api.leaderboard(), api.me()]);
      setPosts(p.posts);
      setLeaderboardUsers(l.users);
      setMe(m.user);
    } catch (e) {
      setBanner({ type: 'err', msg: 'Không tải được dữ liệu. Vui lòng thử lại.' });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (me) refreshAll();
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">Đang tải...</div>;
  }
  if (!me) {
    return <Auth onAuthed={(u) => setMe(u)} />;
  }

  const myScore = avgScore(me.reviews);

  async function handleLogout() {
    await api.logout().catch(() => {});
    setMe(null);
    setPosts([]);
    setLeaderboardUsers([]);
  }

  function toggleCat(id) {
    setActiveCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const filteredPosts = posts.filter((p) => {
    if (!activeCats.includes(p.category)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.skillsNeeded.some((s) => s.toLowerCase().includes(q))
    );
  });

  async function requestJoin(postId) {
    try {
      await api.postAction(postId, 'request_join');
      setBanner({ type: 'ok', msg: 'Đã gửi yêu cầu tham gia. Chờ trưởng nhóm duyệt nhé!' });
      refreshAll();
    } catch {
      setBanner({ type: 'err', msg: 'Không gửi được yêu cầu tham gia.' });
    }
  }

  async function approveRequest(postId, userId) {
    try {
      await api.postAction(postId, 'approve', userId);
      setBanner({ type: 'ok', msg: 'Đã duyệt thành viên mới vào nhóm.' });
      refreshAll();
    } catch {
      setBanner({ type: 'err', msg: 'Không duyệt được yêu cầu (có thể nhóm đã đủ người).' });
    }
  }
  async function denyRequest(postId, userId) {
    await api.postAction(postId, 'deny', userId).catch(() => {});
    refreshAll();
  }

  function addSkillToNewPost() {
    const s = skillInput.trim();
    if (!s) return;
    setNewPost((prev) => ({ ...prev, skillsNeeded: [...prev.skillsNeeded, s] }));
    setSkillInput('');
  }
  function removeSkillFromNewPost(s) {
    setNewPost((prev) => ({ ...prev, skillsNeeded: prev.skillsNeeded.filter((x) => x !== s) }));
  }
  async function submitNewPost() {
    if (!newPost.title.trim() || !newPost.description.trim()) {
      setBanner({ type: 'err', msg: 'Vui lòng nhập tên đồ án và mô tả trước khi đăng.' });
      return;
    }
    try {
      await api.createPost(newPost);
      setNewPost({ title: '', description: '', category: 'dien', skillsNeeded: [], slots: 2 });
      setBanner({ type: 'ok', msg: 'Đã đăng bài tìm nhóm thành công!' });
      setTab('groups');
      refreshAll();
    } catch {
      setBanner({ type: 'err', msg: 'Không đăng được bài. Vui lòng thử lại.' });
    }
  }

  async function addSkillToMe() {
    const name = newSkill.name.trim();
    if (!name) return;
    try {
      await api.addSkill(name, newSkill.level);
      setNewSkill({ name: '', level: 2 });
      refreshAll();
    } catch {
      setBanner({ type: 'err', msg: 'Không thêm được kỹ năng.' });
    }
  }
  async function removeSkillFromMe(name) {
    await api.removeSkill(name).catch(() => {});
    refreshAll();
  }

  async function startCompleteFlow(postId) {
    const post = posts.find((p) => p.id === postId);
    const targets = post.members.filter((u) => u.id !== me.id);
    if (targets.length === 0) {
      await api.postAction(postId, 'complete').catch(() => {});
      setBanner({ type: 'ok', msg: 'Đã đánh dấu hoàn thành đồ án.' });
      refreshAll();
      return;
    }
    setReviewState({ postId, targets, idx: 0, form: { contribution: 4, punctual: 4, skill: 4 } });
  }

  async function submitReview() {
    const { postId, targets, idx, form } = reviewState;
    const targetUser = targets[idx];
    try {
      await api.submitReview({ postId, targetUserId: targetUser.id, ...form });
    } catch {
      setBanner({ type: 'err', msg: 'Không gửi được đánh giá.' });
    }
    if (idx + 1 < targets.length) {
      setReviewState({ ...reviewState, idx: idx + 1, form: { contribution: 4, punctual: 4, skill: 4 } });
    } else {
      await api.postAction(postId, 'complete').catch(() => {});
      setReviewState(null);
      setBanner({ type: 'ok', msg: 'Đã hoàn thành đánh giá nhóm. Điểm Uy tín của các thành viên đã được cập nhật!' });
      refreshAll();
    }
  }

  async function openMatchPanel(postId) {
    setMatchPanel({ postId, loading: true, suggestions: [] });
    try {
      const r = await api.matchCandidates(postId);
      setMatchPanel({ postId, loading: false, suggestions: r.suggestions });
    } catch {
      setMatchPanel({ postId, loading: false, suggestions: [], error: true });
    }
  }

  const myPosts = posts.filter((p) => p.ownerId === me.id);
  const joinedPosts = posts.filter((p) => p.ownerId !== me.id && p.members.some((u) => u.id === me.id));
  const myHistory = posts.filter((p) => p.members.some((u) => u.id === me.id));
  const leaderboard = [...leaderboardUsers].sort((a, b) => {
    const sa = avgScore(a.reviews);
    const sb = avgScore(b.reviews);
    if (sa === null && sb === null) return 0;
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa;
  });

  const TABS = [
    { id: 'explore', label: 'Khám phá', icon: Search },
    { id: 'create', label: 'Đăng bài', icon: Plus },
    { id: 'profile', label: 'Hồ sơ của tôi', icon: User },
    { id: 'groups', label: 'Nhóm của tôi', icon: Users },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`}</style>

      <div className="sticky top-0 z-20 border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#e7e5e4' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
              <span className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>S</span>
            </div>
            <div>
              <div className="font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: '#1c1917' }}>SkillMatch</div>
              <div className="text-xs text-stone-500 leading-none mt-0.5">Ghép nhóm theo kỹ năng &amp; Uy tín</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('profile')} className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border hover:bg-stone-50 transition" style={{ borderColor: '#e7e5e4' }}>
              <ReputationRing score={myScore} size={34} stroke={4} showLabel={false} />
              <div className="text-left">
                <div className="text-sm font-semibold text-stone-900 leading-none">{me.name}</div>
                <div className="text-xs leading-none mt-0.5" style={{ color: tierOf(myScore).hex }}>{tierOf(myScore).label}</div>
              </div>
            </button>
            <button onClick={handleLogout} title="Đăng xuất" className="p-2 rounded-full border text-stone-400 hover:bg-stone-50" style={{ borderColor: '#e7e5e4' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${active ? 'text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                style={active ? { backgroundColor: '#0f766e' } : {}}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {banner && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${banner.type === 'err' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
            <span>{banner.msg}</span>
            <button onClick={() => setBanner(null)}><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 'explore' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-white border rounded-lg px-3 py-2" style={{ borderColor: '#e7e5e4' }}>
                <Search size={16} className="text-stone-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên đồ án, kỹ năng..." className="w-full outline-none text-sm bg-transparent" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORIES.map((c) => {
                const active = activeCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${active ? c.tw : 'bg-white text-stone-400 border-stone-200'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {loadingData && posts.length === 0 && (
              <div className="text-center py-16 text-stone-400 text-sm">Đang tải bài đăng...</div>
            )}

            {!loadingData && filteredPosts.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <Search size={28} className="mx-auto mb-2" />
                <p className="text-sm">Không tìm thấy bài đăng phù hợp — thử đổi bộ lọc hoặc từ khóa khác.</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {filteredPosts.map((p) => {
                const owner = p.owner;
                const isOwner = p.ownerId === me.id;
                const isMember = p.members.some((u) => u.id === me.id);
                const requested = p.joinRequests.some((u) => u.id === me.id);
                const full = p.members.length >= p.slots;
                return (
                  <div key={p.id} className="bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm" style={{ borderColor: '#e7e5e4' }}>
                    <div className="flex items-center justify-between">
                      <CategoryChip id={p.category} />
                      <span className="text-xs text-stone-400 flex items-center gap-1"><Users size={12} />{p.members.length}/{p.slots}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.title}</h3>
                      <p
                        className="text-sm text-stone-500 mt-1"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {p.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.skillsNeeded.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded border bg-stone-50 text-stone-600" style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#e7e5e4' }}>{s}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f0efec' }}>
                      <div className="flex items-center gap-2">
                        <ReputationRing score={owner ? avgScore(owner.reviews) : null} size={28} stroke={3} showLabel={false} />
                        <div>
                          <div className="text-xs font-medium text-stone-800">{owner?.name}</div>
                          <div className="text-xs text-stone-400">Trưởng nhóm</div>
                        </div>
                      </div>
                      {isOwner ? (
                        <span className="text-xs text-stone-400 italic">Bài đăng của bạn</span>
                      ) : isMember ? (
                        <span className="text-xs text-teal-700 font-medium flex items-center gap-1"><Check size={13} />Đã tham gia</span>
                      ) : requested ? (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Clock size={13} />Chờ duyệt</span>
                      ) : full ? (
                        <span className="text-xs text-stone-400">Đã đủ người</span>
                      ) : (
                        <button onClick={() => requestJoin(p.id)} className="text-xs font-medium text-white px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ backgroundColor: '#0f766e' }}>
                          <UserPlus size={13} />Xin tham gia
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div className="max-w-xl">
            <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Đăng bài tìm nhóm</h2>
            <p className="text-sm text-stone-500 mb-5">Mô tả đồ án và kỹ năng bạn cần — SkillMatch sẽ gợi ý đúng người có kỹ năng phù hợp cho bạn.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Tên đồ án / bài tập lớn</label>
                <input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Ví dụ: Cần 2 bạn làm đồ án đo nhiệt độ từ xa"
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: '#e7e5e4' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">Khối ngành</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNewPost({ ...newPost, category: c.id })}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border ${newPost.category === c.id ? c.tw : 'bg-white text-stone-400 border-stone-200'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">Mô tả đồ án</label>
                <textarea
                  value={newPost.description}
                  onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                  rows={4}
                  placeholder="Học phần nào, deadline khi nào, đang cần hỗ trợ gì..."
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ borderColor: '#e7e5e4' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">Kỹ năng cần tìm</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkillToNewPost(); } }}
                    placeholder="Ví dụ: Lập trình nhúng"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: '#e7e5e4' }}
                  />
                  <button onClick={addSkillToNewPost} className="px-3 rounded-lg border text-sm font-medium text-stone-600 hover:bg-stone-50" style={{ borderColor: '#e7e5e4' }}>Thêm</button>
                </div>
                {newPost.skillsNeeded.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newPost.skillsNeeded.map((s) => (
                      <span key={s} className="text-xs px-2 py-1 rounded border bg-stone-50 text-stone-600 flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#e7e5e4' }}>
                        {s}
                        <button onClick={() => removeSkillFromNewPost(s)}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">Số lượng thành viên cần (kể cả bạn)</label>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => setNewPost({ ...newPost, slots: Math.max(1, newPost.slots - 1) })} className="w-8 h-8 rounded-lg border text-stone-600" style={{ borderColor: '#e7e5e4' }}>−</button>
                  <span className="w-6 text-center font-medium">{newPost.slots}</span>
                  <button onClick={() => setNewPost({ ...newPost, slots: Math.min(6, newPost.slots + 1) })} className="w-8 h-8 rounded-lg border text-stone-600" style={{ borderColor: '#e7e5e4' }}>+</button>
                </div>
              </div>

              <button onClick={submitNewPost} className="w-full text-white font-medium py-2.5 rounded-lg mt-2" style={{ backgroundColor: '#0f766e' }}>
                Đăng bài tìm nhóm
              </button>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-1 bg-white border rounded-xl p-5 flex flex-col items-center text-center h-fit" style={{ borderColor: '#e7e5e4' }}>
              <ReputationRing score={myScore} size={100} stroke={8} />
              <h2 className="font-bold text-lg mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{me.name}</h2>
              <p className="text-sm text-stone-500">Sinh viên năm {me.year}</p>
              <div className="mt-2"><CategoryChip id={me.category} /></div>
              <div className="text-xs text-stone-400 mt-4">{(me.reviews || []).length} đánh giá đã nhận</div>
            </div>

            <div className="md:col-span-2 space-y-5">
              <div className="bg-white border rounded-xl p-5" style={{ borderColor: '#e7e5e4' }}>
                <h3 className="font-semibold text-stone-800 mb-3">Kỹ năng của tôi</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(me.skills || []).map((s) => (
                    <span key={s.name} className="text-xs px-2.5 py-1.5 rounded-lg border bg-stone-50 text-stone-700 flex items-center gap-1" style={{ borderColor: '#e7e5e4' }}>
                      {s.name}<LevelDots level={s.level} />
                      <button onClick={() => removeSkillFromMe(s.name)} className="ml-1 text-stone-400 hover:text-stone-600"><X size={12} /></button>
                    </span>
                  ))}
                  {(me.skills || []).length === 0 && <span className="text-xs text-stone-400">Chưa có kỹ năng nào — thêm để hồ sơ nổi bật hơn.</span>}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    placeholder="Thêm kỹ năng mới..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: '#e7e5e4' }}
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3].map((lv) => (
                      <button
                        key={lv}
                        onClick={() => setNewSkill({ ...newSkill, level: lv })}
                        className={`text-xs px-2 py-2 rounded-lg border ${newSkill.level === lv ? 'text-white' : 'text-stone-500 bg-white'}`}
                        style={newSkill.level === lv ? { backgroundColor: '#0f766e', borderColor: '#0f766e' } : { borderColor: '#e7e5e4' }}
                      >
                        {lv === 1 ? 'Mới học' : lv === 2 ? 'Cơ bản' : 'Thành thạo'}
                      </button>
                    ))}
                  </div>
                  <button onClick={addSkillToMe} className="px-3 py-2 rounded-lg border text-sm font-medium text-stone-600 hover:bg-stone-50" style={{ borderColor: '#e7e5e4' }}>Thêm</button>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5" style={{ borderColor: '#e7e5e4' }}>
                <h3 className="font-semibold text-stone-800 mb-3">Lịch sử đồ án</h3>
                {myHistory.length === 0 ? (
                  <p className="text-sm text-stone-400">Bạn chưa tham gia đồ án nào — hãy khám phá và xin tham gia một nhóm!</p>
                ) : (
                  <div className="space-y-2">
                    {myHistory.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2" style={{ borderColor: '#f0efec' }}>
                        <div>
                          <div className="font-medium text-stone-800">{p.title}</div>
                          <div className="text-xs text-stone-400">{p.ownerId === me.id ? 'Trưởng nhóm' : 'Thành viên'}</div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status === 'completed' ? 'Hoàn thành' : 'Đang mở'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'groups' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-bold text-lg mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bài đăng của tôi</h2>
              {myPosts.length === 0 ? (
                <p className="text-sm text-stone-400">Bạn chưa đăng bài tìm nhóm nào.</p>
              ) : (
                <div className="space-y-4">
                  {myPosts.map((p) => (
                    <div key={p.id} className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: '#e7e5e4' }}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-stone-900">{p.title}</h3>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status === 'completed' ? 'Đã hoàn thành' : 'Đang mở'}
                        </span>
                      </div>

                      <div className="text-xs text-stone-500 mb-1.5">Thành viên ({p.members.length}/{p.slots})</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {p.members.map((u) => (
                          <span key={u.id} className="text-xs px-2 py-1 rounded-lg bg-stone-50 border text-stone-700" style={{ borderColor: '#e7e5e4' }}>{u.name}</span>
                        ))}
                      </div>

                      {p.status === 'open' && (
                        <div className="mb-3">
                          <button
                            onClick={() => openMatchPanel(p.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
                            style={{ borderColor: '#0f766e', color: '#0f766e' }}
                          >
                            <Sparkles size={13} />Gợi ý ứng viên phù hợp
                          </button>
                          {matchPanel && matchPanel.postId === p.id && (
                            <div className="mt-2 border rounded-lg p-3" style={{ borderColor: '#f0efec', backgroundColor: '#fafaf9' }}>
                              {matchPanel.loading ? (
                                <div className="text-xs text-stone-400">Đang chấm điểm ứng viên...</div>
                              ) : matchPanel.suggestions.length === 0 ? (
                                <div className="text-xs text-stone-400">Không tìm thấy ứng viên phù hợp.</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {matchPanel.suggestions.slice(0, 6).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between text-sm bg-white border rounded-lg px-2.5 py-1.5" style={{ borderColor: '#f0efec' }}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-teal-700 w-9" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.matchScore}%</span>
                                        <span className="font-medium text-stone-800 truncate">{c.name}</span>
                                      </div>
                                      <span className="text-[10px] text-stone-400 whitespace-nowrap">Kỹ năng {c.skillScore}% · Uy tín {c.reputation ?? '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {p.joinRequests.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-stone-500 mb-1.5">Yêu cầu tham gia</div>
                          <div className="space-y-1.5">
                            {p.joinRequests.map((u) => (
                              <div key={u.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-1.5" style={{ borderColor: '#f0efec' }}>
                                <div className="flex items-center gap-2">
                                  <ReputationRing score={avgScore(u.reviews)} size={24} stroke={3} showLabel={false} />
                                  <span className="font-medium text-stone-800">{u.name}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => approveRequest(p.id, u.id)} className="text-white p-1.5 rounded-lg" style={{ backgroundColor: '#0f766e' }}><Check size={13} /></button>
                                  <button onClick={() => denyRequest(p.id, u.id)} className="border text-stone-500 p-1.5 rounded-lg" style={{ borderColor: '#e7e5e4' }}><X size={13} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.status === 'open' && (
                        <button onClick={() => startCompleteFlow(p.id)} className="text-sm font-medium px-3 py-2 rounded-lg border" style={{ borderColor: '#0f766e', color: '#0f766e' }}>
                          Đánh dấu hoàn thành &amp; đánh giá nhóm
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-bold text-lg mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Nhóm tôi đã tham gia</h2>
              {joinedPosts.length === 0 ? (
                <p className="text-sm text-stone-400">Bạn chưa tham gia nhóm nào do người khác đăng.</p>
              ) : (
                <div className="space-y-3">
                  {joinedPosts.map((p) => (
                    <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm" style={{ borderColor: '#e7e5e4' }}>
                      <div>
                        <div className="font-medium text-stone-800">{p.title}</div>
                        <div className="text-xs text-stone-400">Trưởng nhóm: {p.owner?.name}</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.status === 'completed' ? 'Hoàn thành' : 'Đang hoạt động'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'leaderboard' && (
          <div>
            <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bảng xếp hạng Uy tín</h2>
            <p className="text-sm text-stone-500 mb-5">Xếp hạng dựa trên điểm Uy tín trung bình từ các đánh giá sau mỗi đồ án.</p>
            <div className="bg-white border rounded-xl divide-y" style={{ borderColor: '#e7e5e4' }}>
              {leaderboard.map((u, i) => {
                const score = avgScore(u.reviews);
                const isMe = u.id === me.id;
                return (
                  <div key={u.id} className={`flex items-center gap-4 px-4 py-3 ${isMe ? 'bg-teal-50' : ''}`}>
                    <span className="w-6 text-center font-bold text-stone-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</span>
                    <ReputationRing score={score} size={40} stroke={4} showLabel={false} />
                    <div className="flex-1">
                      <div className="font-medium text-stone-800 flex items-center gap-2">
                        {u.name}{isMe && <span className="text-xs text-teal-700">(Bạn)</span>}
                      </div>
                      <div className="text-xs text-stone-400">Năm {u.year}</div>
                    </div>
                    <CategoryChip id={u.category} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10 pt-2 text-center text-xs text-stone-400">
        SkillMatch — dữ liệu được lưu trong cơ sở dữ liệu, tài khoản và bài đăng của bạn sẽ được giữ lại.
      </div>

      {reviewState && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <div className="text-xs text-stone-400 mb-1">Đánh giá {reviewState.idx + 1}/{reviewState.targets.length}</div>
            <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Đánh giá {reviewState.targets[reviewState.idx].name}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-stone-600 mb-1">Mức độ đóng góp</div>
                <StarInput value={reviewState.form.contribution} onChange={(v) => setReviewState({ ...reviewState, form: { ...reviewState.form, contribution: v } })} />
              </div>
              <div>
                <div className="text-sm text-stone-600 mb-1">Đúng deadline</div>
                <StarInput value={reviewState.form.punctual} onChange={(v) => setReviewState({ ...reviewState, form: { ...reviewState.form, punctual: v } })} />
              </div>
              <div>
                <div className="text-sm text-stone-600 mb-1">Kỹ năng thực tế</div>
                <StarInput value={reviewState.form.skill} onChange={(v) => setReviewState({ ...reviewState, form: { ...reviewState.form, skill: v } })} />
              </div>
            </div>
            <button onClick={submitReview} className="w-full text-white font-medium py-2.5 rounded-lg mt-5" style={{ backgroundColor: '#0f766e' }}>
              {reviewState.idx + 1 < reviewState.targets.length ? 'Gửi & tiếp tục' : 'Gửi & hoàn thành'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
