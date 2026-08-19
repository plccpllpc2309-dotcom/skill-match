import React, { useState } from 'react';
import { api } from './api';

const CATEGORIES = [
  { id: 'dien', label: 'Điện / Điện tử / Nhúng' },
  { id: 'cntt', label: 'CNTT' },
  { id: 'cokhi', label: 'Cơ khí / Tự động hóa' },
  { id: 'khac', label: 'Khác' },
];

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', year: 3, category: 'cntt' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      onAuthed(res.user);
    } catch (e2) {
      const map = {
        invalid_credentials: 'Sai email hoặc mật khẩu.',
        email_taken: 'Email này đã được đăng ký.',
        weak_password: 'Mật khẩu cần tối thiểu 6 ký tự.',
        missing_fields: 'Vui lòng điền đầy đủ thông tin.',
      };
      setErr(map[e2.data?.error] || 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F5F5F4', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div className="w-full max-w-sm bg-white border rounded-xl p-6 shadow-sm" style={{ borderColor: '#e7e5e4' }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
            <span className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>S</span>
          </div>
          <div>
            <div className="font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: '#1c1917' }}>SkillMatch</div>
            <div className="text-xs text-stone-500 leading-none mt-0.5">Ghép nhóm theo kỹ năng &amp; Uy tín</div>
          </div>
        </div>

        <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition ${mode === m ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'}`}
            >
              {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Họ và tên"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#e7e5e4' }}
            />
          )}
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e7e5e4' }}
          />
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e7e5e4' }}
          />
          {mode === 'register' && (
            <>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  placeholder="Năm học"
                  className="w-24 border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: '#e7e5e4' }}
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: '#e7e5e4' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full text-white font-medium py-2.5 rounded-lg mt-1 disabled:opacity-60"
            style={{ backgroundColor: '#0f766e' }}
          >
            {busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>
      </div>
    </div>
  );
}
