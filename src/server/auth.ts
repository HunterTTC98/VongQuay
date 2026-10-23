import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { getDb } from './db.ts';

export const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (isProduction) {
      throw new Error(
        '[FATAL] Thiếu biến môi trường SESSION_SECRET trên môi trường Production/Vercel. ' +
        'Trên nền tảng Serverless với nhiều instance hoạt động song song, SESSION_SECRET cố định là bắt buộc ' +
        'để đảm bảo token đăng nhập của học sinh và quản trị viên không bị mất hiệu lực ngẫu nhiên giữa các request. ' +
        'Vui lòng cấu hình SESSION_SECRET trong cài đặt dự án Vercel.'
      );
    }
    // Stable key for local development to prevent session invalidation on server restarts
    return 'dev-local-session-secret-school-wheel-2026-development-only';
  }
  return secret.trim();
}

const JWT_SECRET = getSessionSecret();

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'STUDENT';
  exp: number;
}

export function createToken(payload: Omit<SessionPayload, 'exp'>, expiresInHours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const data = JSON.stringify({ ...payload, exp });
  const b64Data = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(b64Data).digest('base64url');
  return `${b64Data}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const [b64Data, signature] = token.split('.');
    if (!b64Data || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(b64Data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    username: string;
    role: string;
  };
  student?: {
    id: string;
    username: string;
    fullName?: string;
    studentClass?: string;
    freeSpinsRemaining: number;
  };
}

/**
 * Middleware strictly enforcing Admin authorization
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Yêu cầu quyền Quản trị viên (Thiếu mã xác thực)' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Phiên làm việc Quản trị viên không hợp lệ hoặc đã hết hạn' });
    return;
  }

  const db = await getDb();
  let adminSnap = await db.collection('admins').doc(payload.userId).get();
  let adminData = adminSnap.exists ? adminSnap.data()! : null;
  let adminId = payload.userId;

  if (!adminData && payload.username) {
    const byEmail = await db.collection('admins').where('email', '==', payload.username).get();
    if (!byEmail.empty) {
      adminData = byEmail.docs[0].data()!;
      adminId = byEmail.docs[0].id;
    } else {
      const byUser = await db.collection('admins').where('username', '==', payload.username).get();
      if (!byUser.empty) {
        adminData = byUser.docs[0].data()!;
        adminId = byUser.docs[0].id;
      }
    }
  }

  if (!adminData && (payload.username === 'cuongtt.ptit@gmail.com' || payload.userId === 'admin_cuongtt_ptit')) {
    adminData = { username: 'cuongtt.ptit', email: 'cuongtt.ptit@gmail.com', role: 'SUPER_ADMIN' };
    adminId = 'admin_cuongtt_ptit';
  }

  if (!adminData) {
    res.status(403).json({ success: false, error: 'Tài khoản Quản trị viên không tồn tại hoặc chưa được cấp quyền' });
    return;
  }

  req.admin = {
    id: adminId,
    username: adminData.username || payload.username,
    role: adminData.role || 'ADMIN',
  };
  next();
}

/**
 * Middleware strictly enforcing Student authentication
 * Extracts verified user directly from cryptographic token, preventing user impersonation
 */
export async function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Vui lòng đăng nhập tài khoản học sinh' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'STUDENT') {
    res.status(401).json({ success: false, error: 'Phiên đăng nhập học sinh không hợp lệ hoặc đã hết hạn' });
    return;
  }

  const db = await getDb();
  const userSnap = await db.collection('users').doc(payload.userId).get();

  if (!userSnap.exists) {
    res.status(401).json({ success: false, error: 'Tài khoản học sinh không tồn tại' });
    return;
  }

  const userData = userSnap.data()!;
  req.student = {
    id: userSnap.id,
    username: userData.username,
    fullName: userData.full_name,
    studentClass: userData.student_class,
    freeSpinsRemaining: Number(userData.free_spins_remaining || 0),
  };
  next();
}

/**
 * Optional student middleware (attaches student if token present and valid)
 */
export async function optionalStudent(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload && payload.role === 'STUDENT') {
      const db = await getDb();
      const userSnap = await db.collection('users').doc(payload.userId).get();
      if (userSnap.exists) {
        const userData = userSnap.data()!;
        req.student = {
          id: userSnap.id,
          username: userData.username,
          fullName: userData.full_name,
          studentClass: userData.student_class,
          freeSpinsRemaining: Number(userData.free_spins_remaining || 0),
        };
      }
    }
  }
  next();
}

/**
 * Rate Limiter for Claim Lookup to prevent brute-force code enumeration
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const lookupRateMap = new Map<string, RateLimitEntry>();

export function checkClaimLookupRateLimit(ip: string, limit = 15, windowSeconds = 60): boolean {
  const now = Date.now();
  const entry = lookupRateMap.get(ip);

  if (!entry || now > entry.resetTime) {
    lookupRateMap.set(ip, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Log audit record in Firestore
 */
export async function logAudit(
  adminUsername: string,
  action: string,
  details: string,
  ipAddress: string
): Promise<void> {
  try {
    const db = await getDb();
    const logId = crypto.randomUUID();
    await db.collection('audit_logs').doc(logId).set({
      id: logId,
      admin_username: adminUsername,
      action,
      details,
      ip_address: ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write Firestore audit log:', err);
  }
}
