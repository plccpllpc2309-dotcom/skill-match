import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const COOKIE_NAME = 'sm_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((c) => {
    const idx = c.indexOf('=');
    if (idx === -1) return;
    const k = c.slice(0, idx).trim();
    const v = c.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

export function getUserIdFromReq(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.uid;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res) {
  const uid = getUserIdFromReq(req);
  if (!uid) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  const { rows } = await query(
    'select id, name, email, year, category from users where id = $1',
    [uid]
  );
  if (!rows[0]) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return rows[0];
}

export function withCors(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'server_error', detail: String(err.message || err) });
    }
  };
}
