import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const CREDENTIAL_FILE = path.resolve(process.cwd(), '.initial_admin_credential');
const CONFIG_FILE = path.resolve(process.cwd(), 'firebase-applet-config.json');

/**
 * Hash password using PBKDF2 with SHA-512
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Generate a random salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface FirestoreDocSnapshot<T = any> {
  id: string;
  exists: boolean;
  data(): T | undefined;
}

export interface FirestoreQuerySnapshot<T = any> {
  docs: FirestoreDocSnapshot<T>[];
  empty: boolean;
  size: number;
}

export interface FirestoreTransaction {
  get<T = any>(ref: FirestoreDocRef<T>): Promise<FirestoreDocSnapshot<T>>;
  set<T = any>(ref: FirestoreDocRef<T>, data: T, options?: { merge?: boolean }): void;
  update(ref: FirestoreDocRef<any>, data: Record<string, any>): void;
  delete(ref: FirestoreDocRef<any>): void;
}

export interface FirestoreDocRef<T = any> {
  id: string;
  path: string;
  get(): Promise<FirestoreDocSnapshot<T>>;
  set(data: T, options?: { merge?: boolean }): Promise<void>;
  update(data: Record<string, any>): Promise<void>;
  delete(): Promise<void>;
}

export interface FirestoreQuery<T = any> {
  where(field: string, op: '==' | '!=' | '<' | '<=' | '>' | '>=', value: any): FirestoreQuery<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): FirestoreQuery<T>;
  limit(n: number): FirestoreQuery<T>;
  offset(n: number): FirestoreQuery<T>;
  get(): Promise<FirestoreQuerySnapshot<T>>;
}

export interface FirestoreCollectionRef<T = any> extends FirestoreQuery<T> {
  doc(id?: string): FirestoreDocRef<T>;
}

export interface FirestoreDb {
  collection<T = any>(name: string): FirestoreCollectionRef<T>;
  runTransaction<R>(updateFunction: (transaction: FirestoreTransaction) => Promise<R>): Promise<R>;
  isLiveCloud: boolean;
}

/**
 * Real Firebase Admin Firestore wrapper
 */
class RealFirestoreWrapper implements FirestoreDb {
  private rawDb: any;
  public isLiveCloud = true;

  constructor(rawDb: any) {
    this.rawDb = rawDb;
  }

  collection<T = any>(name: string): FirestoreCollectionRef<T> {
    const rawCol = this.rawDb.collection(name);
    return this.wrapQuery(rawCol);
  }

  private wrapDoc<T = any>(rawDoc: any): FirestoreDocRef<T> {
    return {
      id: rawDoc.id,
      path: rawDoc.path,
      get: async () => {
        const snap = await rawDoc.get();
        return {
          id: snap.id,
          exists: snap.exists,
          data: () => snap.data(),
        };
      },
      set: async (data: T, options?: { merge?: boolean }) => {
        await rawDoc.set(data, options);
      },
      update: async (data: Record<string, any>) => {
        await rawDoc.update(data);
      },
      delete: async () => {
        await rawDoc.delete();
      },
    };
  }

  private wrapQuery<T = any>(rawQuery: any): FirestoreCollectionRef<T> {
    const self = this;
    const queryObj: any = {
      where: (field: string, op: any, value: any) => self.wrapQuery(rawQuery.where(field, op, value)),
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => self.wrapQuery(rawQuery.orderBy(field, direction)),
      limit: (n: number) => self.wrapQuery(rawQuery.limit(n)),
      offset: (n: number) => self.wrapQuery(rawQuery.offset(n)),
      get: async () => {
        const snap = await rawQuery.get();
        const docs = snap.docs.map((d: any) => ({
          id: d.id,
          exists: d.exists,
          data: () => d.data(),
        }));
        return {
          docs,
          empty: snap.empty,
          size: snap.size,
        };
      },
      doc: (id?: string) => {
        const d = id ? rawQuery.doc(id) : rawQuery.doc();
        return self.wrapDoc(d);
      },
    };
    return queryObj;
  }

  async runTransaction<R>(updateFunction: (transaction: FirestoreTransaction) => Promise<R>): Promise<R> {
    return this.rawDb.runTransaction(async (rawTx: any) => {
      const txWrapper: FirestoreTransaction = {
        get: async <T = any>(ref: FirestoreDocRef<T>) => {
          // Resolve internal doc reference
          const rawDocRef = this.rawDb.doc(ref.path);
          const snap = await rawTx.get(rawDocRef);
          return {
            id: snap.id,
            exists: snap.exists,
            data: () => snap.data(),
          };
        },
        set: <T = any>(ref: FirestoreDocRef<T>, data: T, options?: { merge?: boolean }) => {
          const rawDocRef = this.rawDb.doc(ref.path);
          rawTx.set(rawDocRef, data, options);
        },
        update: (ref: FirestoreDocRef<any>, data: Record<string, any>) => {
          const rawDocRef = this.rawDb.doc(ref.path);
          rawTx.update(rawDocRef, data);
        },
        delete: (ref: FirestoreDocRef<any>) => {
          const rawDocRef = this.rawDb.doc(ref.path);
          rawTx.delete(rawDocRef);
        },
      };
      return await updateFunction(txWrapper);
    });
  }
}

/**
 * High-fidelity in-memory Firestore engine
 * Used when running locally or in development before live Firebase credentials are added.
 * Strictly enforces Firestore transaction invariants (reads must happen before writes).
 */
class InMemoryFirestore implements FirestoreDb {
  public isLiveCloud = false;
  private collections = new Map<string, Map<string, Record<string, any>>>();
  private docVersions = new Map<string, number>();

  private getCollectionData(name: string): Map<string, Record<string, any>> {
    let col = this.collections.get(name);
    if (!col) {
      col = new Map();
      this.collections.set(name, col);
    }
    return col;
  }

  collection<T = any>(name: string): FirestoreCollectionRef<T> {
    return this.createQuery<T>(name, [], null, null, null);
  }

  private createQuery<T = any>(
    collectionName: string,
    filters: Array<{ field: string; op: string; value: any }>,
    order: { field: string; direction: 'asc' | 'desc' } | null,
    limitCount: number | null,
    offsetCount: number | null
  ): FirestoreCollectionRef<T> {
    const self = this;

    const queryObj: FirestoreCollectionRef<T> = {
      where: (field: string, op: any, value: any) => {
        return self.createQuery<T>(
          collectionName,
          [...filters, { field, op, value }],
          order,
          limitCount,
          offsetCount
        );
      },
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
        return self.createQuery<T>(collectionName, filters, { field, direction }, limitCount, offsetCount);
      },
      limit: (n: number) => {
        return self.createQuery<T>(collectionName, filters, order, n, offsetCount);
      },
      offset: (n: number) => {
        return self.createQuery<T>(collectionName, filters, order, limitCount, n);
      },
      get: async () => {
        const col = self.getCollectionData(collectionName);
        let items: Array<{ id: string; data: Record<string, any> }> = [];

        for (const [id, val] of col.entries()) {
          let match = true;
          for (const f of filters) {
            const docVal = val[f.field];
            if (f.op === '==' && docVal !== f.value) match = false;
            else if (f.op === '!=' && docVal === f.value) match = false;
            else if (f.op === '<' && !(docVal < f.value)) match = false;
            else if (f.op === '<=' && !(docVal <= f.value)) match = false;
            else if (f.op === '>' && !(docVal > f.value)) match = false;
            else if (f.op === '>=' && !(docVal >= f.value)) match = false;
            if (!match) break;
          }
          if (match) {
            items.push({ id, data: { ...val } });
          }
        }

        if (order) {
          items.sort((a, b) => {
            const valA = a.data[order.field];
            const valB = b.data[order.field];
            if (valA < valB) return order.direction === 'asc' ? -1 : 1;
            if (valA > valB) return order.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }

        if (offsetCount !== null && offsetCount > 0) {
          items = items.slice(offsetCount);
        }
        if (limitCount !== null && limitCount >= 0) {
          items = items.slice(0, limitCount);
        }

        const docs = items.map((item) => ({
          id: item.id,
          exists: true,
          data: () => ({ ...item.data }) as T,
        }));

        return {
          docs,
          empty: docs.length === 0,
          size: docs.length,
        };
      },
      doc: (id?: string) => {
        const docId = id || crypto.randomUUID();
        const docPath = `${collectionName}/${docId}`;

        const docRef: FirestoreDocRef<T> = {
          id: docId,
          path: docPath,
          get: async () => {
            const col = self.getCollectionData(collectionName);
            const val = col.get(docId);
            return {
              id: docId,
              exists: val !== undefined,
              data: () => (val ? { ...val } : undefined) as T | undefined,
            };
          },
          set: async (data: T, options?: { merge?: boolean }) => {
            const col = self.getCollectionData(collectionName);
            if (options?.merge) {
              const existing = col.get(docId) || {};
              col.set(docId, { ...existing, ...(data as any) });
            } else {
              col.set(docId, { ...(data as any) });
            }
            const currentVer = self.docVersions.get(docPath) || 0;
            self.docVersions.set(docPath, currentVer + 1);
          },
          update: async (data: Record<string, any>) => {
            const col = self.getCollectionData(collectionName);
            const existing = col.get(docId);
            if (!existing) {
              throw new Error(`NOT_FOUND: Document ${docPath} does not exist`);
            }
            col.set(docId, { ...existing, ...data });
            const currentVer = self.docVersions.get(docPath) || 0;
            self.docVersions.set(docPath, currentVer + 1);
          },
          delete: async () => {
            const col = self.getCollectionData(collectionName);
            col.delete(docId);
            const currentVer = self.docVersions.get(docPath) || 0;
            self.docVersions.set(docPath, currentVer + 1);
          },
        };
        return docRef;
      },
    };

    return queryObj;
  }

  async runTransaction<R>(updateFunction: (transaction: FirestoreTransaction) => Promise<R>): Promise<R> {
    const reads = new Map<string, { ver: number; data?: Record<string, any> }>();
    let writePerformed = false;
    const pendingWrites: Array<() => void> = [];

    const tx: FirestoreTransaction = {
      get: async <T = any>(ref: FirestoreDocRef<T>) => {
        if (writePerformed) {
          throw new Error('Firestore transactions require all reads to be executed before all writes');
        }
        const [colName, docId] = ref.path.split('/');
        const col = this.getCollectionData(colName);
        const data = col.get(docId);
        const ver = this.docVersions.get(ref.path) || 0;
        reads.set(ref.path, { ver, data: data ? { ...data } : undefined });

        return {
          id: ref.id,
          exists: data !== undefined,
          data: () => (data ? ({ ...data } as T) : undefined),
        };
      },
      set: <T = any>(ref: FirestoreDocRef<T>, data: T, options?: { merge?: boolean }) => {
        writePerformed = true;
        pendingWrites.push(() => {
          const [colName, docId] = ref.path.split('/');
          const col = this.getCollectionData(colName);
          if (options?.merge) {
            const existing = col.get(docId) || {};
            col.set(docId, { ...existing, ...data });
          } else {
            col.set(docId, { ...(data as any) });
          }
          const currentVer = this.docVersions.get(ref.path) || 0;
          this.docVersions.set(ref.path, currentVer + 1);
        });
      },
      update: (ref: FirestoreDocRef<any>, data: Record<string, any>) => {
        writePerformed = true;
        pendingWrites.push(() => {
          const [colName, docId] = ref.path.split('/');
          const col = this.getCollectionData(colName);
          const existing = col.get(docId);
          if (!existing) {
            throw new Error(`NOT_FOUND: Document ${ref.path} does not exist`);
          }
          col.set(docId, { ...existing, ...data });
          const currentVer = this.docVersions.get(ref.path) || 0;
          this.docVersions.set(ref.path, currentVer + 1);
        });
      },
      delete: (ref: FirestoreDocRef<any>) => {
        writePerformed = true;
        pendingWrites.push(() => {
          const [colName, docId] = ref.path.split('/');
          const col = this.getCollectionData(colName);
          col.delete(docId);
          const currentVer = this.docVersions.get(ref.path) || 0;
          this.docVersions.set(ref.path, currentVer + 1);
        });
      },
    };

    // Execute user transaction logic
    const result = await updateFunction(tx);

    // Optimistic concurrency verification: ensure no document changed during transaction
    for (const [docPath, { ver }] of reads.entries()) {
      const currentVer = this.docVersions.get(docPath) || 0;
      if (currentVer !== ver) {
        throw new Error(`ABORTED: Concurrent modification detected on document ${docPath}`);
      }
    }

    // Commit writes atomically
    for (const writeOp of pendingWrites) {
      writeOp();
    }

    return result;
  }
}

let dbInstance: FirestoreDb | null = null;

/**
 * Initialize Firestore Database client (live Firebase on Vercel/Cloud or in-memory fallback)
 */
export async function initDb(): Promise<FirestoreDb> {
  if (dbInstance) return dbInstance;

  let appConfig: any = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      appConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      // ignore
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || appConfig.projectId;
  const databaseId = process.env.FIREBASE_DATABASE_ID || appConfig.firestoreDatabaseId;

  // 1. Check if Firebase service account credentials are provided
  let adminApp: App | null = null;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('[Firestore] Initializing using FIREBASE_SERVICE_ACCOUNT_KEY env var...');
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp(
        {
          credential: cert(creds),
          projectId: creds.project_id || projectId,
        },
        'school-wheel-admin'
      );
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('[Firestore] Initializing using FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY...');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      adminApp = initializeApp(
        {
          credential: cert({
            projectId: projectId || 'jumping-earth-38f9p',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        },
        'school-wheel-admin'
      );
    }

    if (adminApp) {
      const rawDb = databaseId ? getAdminFirestore(adminApp, databaseId) : getAdminFirestore(adminApp);
      // Test read to confirm permissions
      console.log('[Firestore] Testing live Firestore connection with project:', projectId);
      await rawDb.collection('event_config').doc('current').get();
      console.log('[Firestore] Successfully connected to live Google Cloud Firestore!');
      dbInstance = new RealFirestoreWrapper(rawDb);
    }
  } catch (err: any) {
    console.warn('[Firestore] Live Firestore credentials not available or failed:', err.message);
  }

  // 2. Fallback to In-Memory Firestore engine for dev/preview
  if (!dbInstance) {
    console.log('[Firestore] Using in-memory Firestore engine with full ACID transaction support.');
    dbInstance = new InMemoryFirestore();
  }

  // 3. Bootstrap collections & default admin
  await bootstrapFirestoreData(dbInstance);

  return dbInstance;
}

export async function getDb(): Promise<FirestoreDb> {
  return initDb();
}

/**
 * Bootstrap default event settings, prize tiers and master admin account
 */
async function bootstrapFirestoreData(db: FirestoreDb) {
  // 1. Event config
  const eventRef = db.collection('event_config').doc('current');
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    await eventRef.set({
      name: 'Ngày Hội Trường Học 2026 - Vòng Quay May Mắn',
      occasion: 'HOI_TRUONG_2026',
      status: 'ACTIVE',
      total_budget: 3000000,
      used_budget: 0,
      updated_at: new Date().toISOString(),
    });
    console.log('[Firestore] Seeded initial event_config/current');
  }

  // 2. Prize tiers (slot_0 through slot_7)
  const tierConfigs = [
    { slot: 0, name: '10.000đ', isCash: 1, amount: 10000, total: 50, rem: 50, weight: 45 },
    { slot: 1, name: 'Chúc may mắn lần sau', isCash: 0, amount: 0, total: 999999, rem: 999999, weight: 30 },
    { slot: 2, name: '50.000đ', isCash: 1, amount: 50000, total: 20, rem: 20, weight: 20 },
    { slot: 3, name: 'Thêm năng lượng học tập', isCash: 0, amount: 0, total: 999999, rem: 999999, weight: 30 },
    { slot: 4, name: '20.000đ', isCash: 1, amount: 20000, total: 35, rem: 35, weight: 35 },
    { slot: 5, name: 'Nụ cười tỏa sáng', isCash: 0, amount: 0, total: 999999, rem: 999999, weight: 30 },
    { slot: 6, name: '100.000đ (Đặc Biệt)', isCash: 1, amount: 100000, total: 5, rem: 5, weight: 10 },
    { slot: 7, name: 'Chúc học kỳ rực rỡ', isCash: 0, amount: 0, total: 999999, rem: 999999, weight: 30 },
  ];

  for (const t of tierConfigs) {
    const tierRef = db.collection('prize_tiers').doc(`slot_${t.slot}`);
    const snap = await tierRef.get();
    if (!snap.exists) {
      await tierRef.set({
        id: crypto.randomUUID(),
        slot_index: t.slot,
        name: t.name,
        is_cash: t.isCash,
        amount: t.amount,
        total_quantity: t.total,
        remaining_quantity: t.rem,
        probability_weight: t.weight,
      });
    }
  }

  // 3. Admin Account Initialization
  const adminSnap = await db.collection('admins').where('username', '==', 'admin').get();

  if (adminSnap.empty) {
    const salt = generateSalt();
    let initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    let isGenerated = false;

    if (!initialPassword || initialPassword.trim().length < 8) {
      initialPassword = crypto.randomBytes(8).toString('hex');
      isGenerated = true;
    }

    const hash = hashPassword(initialPassword, salt);
    const adminId = crypto.randomUUID();

    await db.collection('admins').doc(adminId).set({
      id: adminId,
      username: 'admin',
      password_hash: hash,
      password_salt: salt,
      role: 'SUPER_ADMIN',
      created_at: new Date().toISOString(),
    });

    try {
      fs.writeFileSync(
        CREDENTIAL_FILE,
        `TÀI KHOẢN QUẢN TRỊ VIÊN BAN ĐẦU:\nTên đăng nhập: admin\nMật khẩu khởi tạo: ${initialPassword}\n(Đổi mật khẩu ngay sau khi đăng nhập lần đầu tại trang Quản Trị)\n`
      );
    } catch {
      // ignore
    }

    console.log('====================================================');
    console.log('[SECURITY] ĐÃ KHỞI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN MỚI TRÊN FIRESTORE');
    console.log(`Tên đăng nhập: admin`);
    console.log(`Mật khẩu ${isGenerated ? '(Ngẫu nhiên bảo mật)' : '(Từ biến môi trường)'}: ${initialPassword}`);
    console.log('Vui lòng lưu mật khẩu trên và đổi ngay trong phần Quản Trị.');
    console.log('====================================================');
  }
}
