import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import {
  getDb,
  hashPassword,
  generateSalt,
} from './db.ts';
import {
  WHEEL_SLOTS,
  maskPhoneNumber,
  maskStudentName,
  maskStudentClass,
  maskTransactionRef,
  generateTicketCode,
  generateClaimCode,
  determineSpinOutcome,
  validateClaimInput,
  isValidClaimTransition,
  validateBudgetUpdate,
  validatePrizeTierUpdate,
  AvailablePrizeTier,
  ClaimStatus,
} from './rules.ts';
import {
  requireAdmin,
  requireStudent,
  optionalStudent,
  createToken,
  logAudit,
  AuthenticatedRequest,
  checkClaimLookupRateLimit,
} from './auth.ts';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const eventSnap = await db.collection('event_config').doc('current').get();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'firestore',
      isLiveCloud: db.isLiveCloud,
      eventConfigured: eventSnap.exists,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * Public Event Configuration and Live Stats
 */
router.get('/event', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const eventSnap = await db.collection('event_config').doc('current').get();
    const event = eventSnap.exists ? eventSnap.data() : null;

    const prizesSnap = await db.collection('prize_tiers').orderBy('slot_index', 'asc').get();
    const prizeSummary = prizesSnap.docs.map((d) => d.data()!);

    const totalCashRemaining = prizeSummary
      .filter((p) => Number(p.is_cash) === 1)
      .reduce((acc, p) => acc + Number(p.remaining_quantity || 0), 0);

    const totalBudget = Number(event?.total_budget || 0);
    const usedBudget = Number(event?.used_budget || 0);

    res.json({
      success: true,
      event: {
        name: event?.name || 'Sự Kiện Trường Học',
        occasion: event?.occasion || 'HOI_TRUONG_2026',
        status: event?.status || 'ACTIVE',
        totalBudget,
        usedBudget,
        remainingBudget: Math.max(0, totalBudget - usedBudget),
        totalCashRemaining,
        slots: WHEEL_SLOTS,
        prizes: prizeSummary.map((p) => ({
          slot_index: Number(p.slot_index),
          name: p.name,
          is_cash: Number(p.is_cash),
          amount: Number(p.amount),
          remaining_quantity: Number(p.remaining_quantity),
          total_quantity: Number(p.total_quantity),
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Verify a ticket code validity without revealing other tickets
 */
router.post('/tickets/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ valid: false, message: 'Vui lòng cung cấp mã vé' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const db = await getDb();
    const ticketSnap = await db.collection('tickets').doc(cleanCode).get();

    if (!ticketSnap.exists) {
      res.json({ valid: false, status: 'NOT_FOUND', message: 'Mã vé không tồn tại trong hệ thống' });
      return;
    }

    const ticket = ticketSnap.data()!;

    if (ticket.status === 'USED') {
      res.json({ valid: false, status: 'USED', message: 'Mã vé này đã được sử dụng trước đó' });
      return;
    }

    if (ticket.status === 'REVOKED') {
      res.json({ valid: false, status: 'REVOKED', message: 'Mã vé này đã bị ban tổ chức thu hồi' });
      return;
    }

    res.json({
      valid: true,
      status: 'UNUSED',
      occasion: ticket.occasion,
      message: 'Mã vé hợp lệ! Bạn có thể sử dụng để quay giải thưởng tiền mặt.',
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

/**
 * CRITICAL TRANSACTIONAL ENDPOINT: Execute Wheel Spin
 * All ticket verification, outcome calculation, inventory deduction, and claim generation
 * happen strictly inside a single Firestore ACID Transaction!
 */
router.post('/spin', optionalStudent, async (req: AuthenticatedRequest, res: Response) => {
  const { spinType, ticketCode } = req.body;

  if (!['TICKET', 'FREE', 'TRIAL'].includes(spinType)) {
    res.status(400).json({ success: false, error: 'Hình thức quay không hợp lệ' });
    return;
  }

  // TRIAL SPIN: Pure calculation, zero database writes
  if (spinType === 'TRIAL') {
    const outcome = determineSpinOutcome({
      spinType: 'TRIAL',
      availablePrizes: [],
      remainingBudget: 0,
    });
    res.json({
      success: true,
      isTrial: true,
      result: {
        slotIndex: outcome.slotIndex,
        slotName: outcome.slotName,
        amount: 0,
        isWin: false,
        isCash: false,
        message: 'Đây là lượt quay thử! Kết quả không có giá trị nhận thưởng và không thay đổi dữ liệu.',
      },
    });
    return;
  }

  try {
    const db = await getDb();

    // Execute spin entirely inside Firestore runTransaction
    const result = await db.runTransaction(async (tx) => {
      const eventRef = db.collection('event_config').doc('current');
      const eventSnap = await tx.get(eventRef);
      const event = eventSnap.exists ? eventSnap.data() : null;

      if (!event || event.status !== 'ACTIVE') {
        const statusMsg = event?.status === 'PAUSED' ? 'Sự kiện đang tạm dừng' : 'Sự kiện đã kết thúc';
        throw new Error(`${statusMsg}. Ban tổ chức hiện không mở lượt quay!`);
      }

      const totalBudget = Number(event.total_budget || 0);
      const usedBudget = Number(event.used_budget || 0);
      const remainingBudget = Math.max(0, totalBudget - usedBudget);

      // 1. Handle FREE SPIN (Requires verified student token)
      if (spinType === 'FREE') {
        if (!req.student) {
          throw new Error('Vui lòng đăng nhập tài khoản học sinh để sử dụng lượt quay miễn phí');
        }

        const userRef = db.collection('users').doc(req.student.id);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists) {
          throw new Error('Tài khoản học sinh không tồn tại');
        }

        const studentUser = userSnap.data()!;
        const remainingSpins = Number(studentUser.free_spins_remaining || 0);
        if (remainingSpins <= 0) {
          throw new Error('Bạn đã sử dụng hết 3 lượt quay miễn phí!');
        }

        const newFreeSpins = remainingSpins - 1;
        const outcome = determineSpinOutcome({
          spinType: 'FREE',
          availablePrizes: [],
          remainingBudget: 0,
        });

        const spinId = crypto.randomUUID();
        const nowStr = new Date().toISOString();

        // Transaction Writes
        tx.update(userRef, { free_spins_remaining: newFreeSpins });
        tx.set(db.collection('spins').doc(spinId), {
          id: spinId,
          user_id: req.student.id,
          spin_type: 'FREE',
          ticket_code: null,
          prize_amount: 0,
          prize_name: outcome.slotName,
          slot_index: outcome.slotIndex,
          is_win: 0,
          claim_code: null,
          created_at: nowStr,
        });

        return {
          success: true,
          isTrial: false,
          result: {
            slotIndex: outcome.slotIndex,
            slotName: outcome.slotName,
            amount: 0,
            isWin: false,
            isCash: false,
            freeSpinsRemaining: newFreeSpins,
            message: outcome.slotName,
          },
        };
      }

      // 2. Handle TICKET SPIN
      if (spinType === 'TICKET') {
        if (!ticketCode || typeof ticketCode !== 'string') {
          throw new Error('Vui lòng nhập mã vé hợp lệ');
        }

        const cleanCode = ticketCode.trim().toUpperCase();
        const ticketRef = db.collection('tickets').doc(cleanCode);

        // Firestore Transaction invariant: ALL READS FIRST
        const ticketSnap = await tx.get(ticketRef);
        if (!ticketSnap.exists) {
          throw new Error('Mã vé không tồn tại trong hệ thống');
        }

        const ticket = ticketSnap.data()!;
        if (ticket.status === 'USED') {
          throw new Error('Mã vé này đã được sử dụng!');
        }
        if (ticket.status === 'REVOKED') {
          throw new Error('Mã vé này đã bị thu hồi bởi ban tổ chức');
        }

        // Read all 8 prize tiers inside the transaction
        const prizeTierSnaps = await Promise.all(
          [0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) =>
            tx.get(db.collection('prize_tiers').doc(`slot_${slotIdx}`))
          )
        );

        const availableCashPrizes: AvailablePrizeTier[] = [];
        const prizeDataMap = new Map<number, any>();

        for (const snap of prizeTierSnaps) {
          if (snap.exists) {
            const p = snap.data()!;
            prizeDataMap.set(Number(p.slot_index), p);
            if (Number(p.is_cash) === 1) {
              availableCashPrizes.push({
                slot_index: Number(p.slot_index),
                remaining: Number(p.remaining_quantity || 0),
                amount: Number(p.amount || 0),
                probability_weight: Number(p.probability_weight || 10),
              });
            }
          }
        }

        // Calculate Outcome
        const outcome = determineSpinOutcome({
          spinType: 'TICKET',
          availablePrizes: availableCashPrizes,
          remainingBudget,
        });

        const nowStr = new Date().toISOString();
        const spinId = crypto.randomUUID();
        let claimCode: string | null = null;
        const usedBy = req.student ? req.student.username : 'GUEST';

        // ALL WRITES AFTER READS
        // 1. Mark ticket USED
        tx.update(ticketRef, {
          status: 'USED',
          used_at: nowStr,
          used_by: usedBy,
        });

        // 2. If won cash prize, atomically decrement inventory & update used budget
        if (outcome.isWin && outcome.amount > 0) {
          claimCode = generateClaimCode();
          const wonTierRef = db.collection('prize_tiers').doc(`slot_${outcome.slotIndex}`);
          const currentWonTier = prizeDataMap.get(outcome.slotIndex);
          const currentRem = Number(currentWonTier?.remaining_quantity || 0);

          if (currentRem <= 0) {
            throw new Error('Giải thưởng này vừa hết số lượng! Vui lòng thử lại.');
          }

          tx.update(wonTierRef, {
            remaining_quantity: currentRem - 1,
          });

          tx.update(eventRef, {
            used_budget: usedBudget + outcome.amount,
            updated_at: nowStr,
          });

          // Create Claim Record
          const claimRef = db.collection('claims').doc(claimCode);
          tx.set(claimRef, {
            claim_code: claimCode,
            spin_id: spinId,
            ticket_code: cleanCode,
            prize_amount: outcome.amount,
            student_name: '',
            student_class: '',
            phone: '',
            payout_method: 'CASH_DIRECT',
            payout_account: '',
            status: 'UNSUBMITTED',
            admin_note: '',
            transaction_ref: '',
            created_at: nowStr,
            updated_at: nowStr,
          });
        }

        // 3. Record Spin Record
        const spinRef = db.collection('spins').doc(spinId);
        tx.set(spinRef, {
          id: spinId,
          user_id: req.student ? req.student.id : null,
          spin_type: 'TICKET',
          ticket_code: cleanCode,
          prize_amount: outcome.amount,
          prize_name: outcome.slotName,
          slot_index: outcome.slotIndex,
          is_win: outcome.isWin ? 1 : 0,
          claim_code: claimCode,
          created_at: nowStr,
        });

        return {
          success: true,
          isTrial: false,
          result: {
            slotIndex: outcome.slotIndex,
            slotName: outcome.slotName,
            amount: outcome.amount,
            isWin: outcome.isWin,
            isCash: outcome.isCash,
            claimCode,
            ticketCode: cleanCode,
            message: outcome.isWin
              ? `Chúc mừng bạn đã trúng thưởng ${outcome.slotName}!`
              : 'Chúc bạn may mắn lần sau!',
          },
        };
      }

      throw new Error('Yêu cầu không được hỗ trợ');
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Lỗi khi xử lý lượt quay' });
  }
});

/**
 * Public Claim Lookup by Claim Code (Rate-limited, Data Minimized)
 */
router.get('/claims/:code', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkClaimLookupRateLimit(ip)) {
      res.status(429).json({
        success: false,
        error: 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 1 phút.',
      });
      return;
    }

    const { code } = req.params;
    if (!code) {
      res.status(400).json({ success: false, error: 'Thiếu mã nhận thưởng' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const db = await getDb();
    const claimSnap = await db.collection('claims').doc(cleanCode).get();

    if (!claimSnap.exists) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thông tin giải thưởng với mã này' });
      return;
    }

    const claim = claimSnap.data()!;

    // Data Minimization: protect student privacy by masking personal details
    res.json({
      success: true,
      claim: {
        claimCode: claim.claim_code,
        prizeAmount: Number(claim.prize_amount),
        maskedStudentName: maskStudentName(claim.student_name || ''),
        maskedClass: maskStudentClass(claim.student_class || ''),
        maskedPhone: maskPhoneNumber(claim.phone || ''),
        payoutMethod: claim.payout_method,
        status: claim.status,
        maskedTransactionRef: maskTransactionRef(claim.transaction_ref || ''),
        createdAt: claim.created_at,
        updatedAt: claim.updated_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Submit Student Information for Prize Claim
 * STRICT: Only allowed once when status is UNSUBMITTED!
 */
router.post('/claims/:code/submit', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { studentName, studentClass, phone, payoutMethod, payoutAccount } = req.body;

    const validation = validateClaimInput({
      name: studentName,
      studentClass,
      phone,
    });

    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const cleanCode = (code || '').trim().toUpperCase();
    const db = await getDb();

    // Use Firestore transaction to prevent race conditions during submission
    await db.runTransaction(async (tx) => {
      const claimRef = db.collection('claims').doc(cleanCode);
      const claimSnap = await tx.get(claimRef);

      if (!claimSnap.exists) {
        throw new Error('Mã nhận thưởng không tồn tại');
      }

      const claim = claimSnap.data()!;
      if (claim.status !== 'UNSUBMITTED') {
        throw new Error(
          `Yêu cầu nhận thưởng này đã được gửi trước đó (trạng thái: [${claim.status}]). Không thể sửa đổi thông tin đã nộp!`
        );
      }

      const nowStr = new Date().toISOString();
      tx.update(claimRef, {
        student_name: studentName.trim(),
        student_class: studentClass.trim(),
        phone: phone.trim(),
        payout_method: payoutMethod || 'CASH_DIRECT',
        payout_account: payoutAccount ? payoutAccount.trim() : '',
        status: 'PENDING_VERIFICATION',
        updated_at: nowStr,
      });
    });

    res.json({
      success: true,
      message: 'Thông tin nhận thưởng đã được gửi thành công. Ban tổ chức sẽ tiến hành xác minh!',
      status: 'PENDING_VERIFICATION',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Lỗi khi gửi thông tin' });
  }
});

/**
 * Student Registration with Password
 */
router.post('/auth/student-register', async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, studentClass } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 4 ký tự' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDb();

    const existingSnap = await db.collection('users').where('username', '==', cleanUsername).get();
    if (!existingSnap.empty) {
      res.status(400).json({ success: false, error: 'Tên tài khoản này đã được sử dụng. Vui lòng đăng nhập.' });
      return;
    }

    const newUserId = crypto.randomUUID();
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    const nowStr = new Date().toISOString();

    await db.collection('users').doc(newUserId).set({
      id: newUserId,
      username: cleanUsername,
      password_hash: hash,
      password_salt: salt,
      full_name: fullName?.trim() || cleanUsername,
      student_class: studentClass?.trim() || '',
      free_spins_remaining: 3,
      created_at: nowStr,
    });

    const token = createToken({
      userId: newUserId,
      username: cleanUsername,
      role: 'STUDENT',
    });

    res.json({
      success: true,
      token,
      user: {
        id: newUserId,
        username: cleanUsername,
        fullName: fullName?.trim() || cleanUsername,
        studentClass: studentClass?.trim() || '',
        freeSpinsRemaining: 3,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Student Login with Password
 */
router.post('/auth/student-login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDb();

    const userQuery = await db.collection('users').where('username', '==', cleanUsername).get();
    if (userQuery.empty) {
      res.status(401).json({ success: false, error: 'Tài khoản không tồn tại. Vui lòng đăng ký tài khoản mới.' });
      return;
    }

    const userDoc = userQuery.docs[0];
    const user = userDoc.data()!;

    if (user.password_hash && user.password_salt) {
      const checkHash = hashPassword(password, user.password_salt);
      if (checkHash !== user.password_hash) {
        res.status(401).json({ success: false, error: 'Mật khẩu học sinh không chính xác' });
        return;
      }
    }

    const token = createToken({
      userId: userDoc.id,
      username: user.username,
      role: 'STUDENT',
    });

    res.json({
      success: true,
      token,
      user: {
        id: userDoc.id,
        username: user.username,
        fullName: user.full_name,
        studentClass: user.student_class,
        freeSpinsRemaining: Number(user.free_spins_remaining || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Issue or claim 1 event ticket per verified student account per occasion
 * STRICT: Protected by requireStudent; uses authenticated req.student.id
 */
router.post('/auth/claim-event-ticket', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = req.student!;
    const db = await getDb();

    const result = await db.runTransaction(async (tx) => {
      const eventRef = db.collection('event_config').doc('current');
      const eventSnap = await tx.get(eventRef);
      const occasion = eventSnap.exists ? eventSnap.data()?.occasion || 'HOI_TRUONG_2026' : 'HOI_TRUONG_2026';

      // Check if student already received ticket for this occasion
      const ownerDocId = `${student.id}_${occasion}`;
      const ownerRef = db.collection('ticket_owners').doc(ownerDocId);
      const ownerSnap = await tx.get(ownerRef);

      if (ownerSnap.exists) {
        const ownerData = ownerSnap.data()!;
        throw new Error(
          `Tài khoản đã nhận vé dự thưởng cho dịp này rồi (Mã vé: ${ownerData.ticket_code}). Mỗi tài khoản chỉ nhận tối đa 1 vé!`
        );
      }

      // Generate a new unique ticket for the student
      const assignedCode = generateTicketCode('SCH');
      const nowStr = new Date().toISOString();
      const ticketRef = db.collection('tickets').doc(assignedCode);

      tx.set(ticketRef, {
        code: assignedCode,
        occasion,
        status: 'UNUSED',
        created_at: nowStr,
        used_at: null,
        used_by: null,
      });

      tx.set(ownerRef, {
        id: crypto.randomUUID(),
        user_id: student.id,
        occasion,
        ticket_code: assignedCode,
        claimed_at: nowStr,
      });

      return assignedCode;
    });

    res.json({
      success: true,
      ticketCode: result,
      message: 'Chúc mừng bạn đã nhận vé dự thưởng thành công!',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ========================================================
   ADMIN ENDPOINTS (Guarded by requireAdmin & backend token)
======================================================== */

/**
 * Admin Login
 */
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tài khoản và mật khẩu quản trị' });
      return;
    }

    const cleanUsername = username.trim();
    const db = await getDb();

    const adminQuery = await db.collection('admins').where('username', '==', cleanUsername).get();
    if (adminQuery.empty) {
      res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác' });
      return;
    }

    const adminDoc = adminQuery.docs[0];
    const admin = adminDoc.data()!;

    const hashed = hashPassword(password, admin.password_salt);
    if (hashed !== admin.password_hash) {
      res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác' });
      return;
    }

    const token = createToken({
      userId: adminDoc.id,
      username: admin.username,
      role: 'ADMIN',
    });

    await logAudit(admin.username, 'LOGIN', 'Quản trị viên đăng nhập thành công', req.ip || '127.0.0.1');

    res.json({
      success: true,
      token,
      admin: {
        id: adminDoc.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Get Current Profile
 */
router.get('/admin/me', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, admin: req.admin });
});

/**
 * Admin: Change Password
 */
router.post('/admin/change-password', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
      return;
    }

    const db = await getDb();
    const adminRef = db.collection('admins').doc(req.admin!.id);
    const adminSnap = await adminRef.get();

    if (!adminSnap.exists) {
      res.status(404).json({ success: false, error: 'Tài khoản không tồn tại' });
      return;
    }

    const admin = adminSnap.data()!;
    const checkHash = hashPassword(oldPassword, admin.password_salt);
    if (checkHash !== admin.password_hash) {
      res.status(400).json({ success: false, error: 'Mật khẩu cũ không chính xác' });
      return;
    }

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    await adminRef.update({
      password_hash: newHash,
      password_salt: newSalt,
    });

    await logAudit(admin.username, 'CHANGE_PASSWORD', 'Đã đổi mật khẩu quản trị', req.ip || '127.0.0.1');

    res.json({ success: true, message: 'Đổi mật khẩu quản trị thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Overall Dashboard Stats
 */
router.get('/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const eventSnap = await db.collection('event_config').doc('current').get();
    const event = eventSnap.exists ? eventSnap.data() : null;

    const ticketsSnap = await db.collection('tickets').get();
    const allTickets = ticketsSnap.docs.map((d) => d.data()!);

    const totalTickets = allTickets.length;
    const usedTickets = allTickets.filter((t) => t.status === 'USED').length;
    const revokedTickets = allTickets.filter((t) => t.status === 'REVOKED').length;
    const unusedTickets = allTickets.filter((t) => t.status === 'UNUSED').length;

    const spinsSnap = await db.collection('spins').get();
    const allSpins = spinsSnap.docs.map((d) => d.data()!);
    const totalSpins = allSpins.length;
    const winSpins = allSpins.filter((s) => Number(s.is_win) === 1).length;

    const claimsSnap = await db.collection('claims').get();
    const allClaims = claimsSnap.docs.map((d) => d.data()!);

    // Summarize claims by status
    const claimsStatusMap = new Map<string, { count: number; total_amount: number }>();
    for (const c of allClaims) {
      const st = c.status || 'UNSUBMITTED';
      const existing = claimsStatusMap.get(st) || { count: 0, total_amount: 0 };
      existing.count += 1;
      existing.total_amount += Number(c.prize_amount || 0);
      claimsStatusMap.set(st, existing);
    }

    const claimsSummary = Array.from(claimsStatusMap.entries()).map(([status, val]) => ({
      status,
      count: val.count,
      total_amount: val.total_amount,
    }));

    const prizesSnap = await db.collection('prize_tiers').orderBy('slot_index', 'asc').get();
    const prizeTiers = prizesSnap.docs.map((d) => d.data()!);

    res.json({
      success: true,
      stats: {
        event,
        tickets: {
          total: totalTickets,
          used: usedTickets,
          unused: unusedTickets,
          revoked: revokedTickets,
        },
        spins: {
          total: totalSpins,
          win: winSpins,
        },
        claimsSummary,
        prizeTiers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Toggle Event Status ('ACTIVE', 'PAUSED', 'ENDED')
 */
router.post('/admin/event/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'ENDED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' });
      return;
    }

    const db = await getDb();
    const nowStr = new Date().toISOString();
    await db.collection('event_config').doc('current').update({
      status,
      updated_at: nowStr,
    });

    await logAudit(
      req.admin!.username,
      'EVENT_STATUS_CHANGE',
      `Thay đổi trạng thái sự kiện thành: ${status}`,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, status, message: `Đã cập nhật trạng thái sự kiện: ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Update Event Configuration (Name, Total Budget) with validation
 */
router.post('/admin/event/config', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, totalBudget, occasion } = req.body;
    const db = await getDb();
    const eventRef = db.collection('event_config').doc('current');
    const eventSnap = await eventRef.get();
    const event = eventSnap.exists ? eventSnap.data() : null;

    if (totalBudget !== undefined) {
      const budgetVal = validateBudgetUpdate(Number(totalBudget), Number(event?.used_budget || 0));
      if (!budgetVal.valid) {
        res.status(400).json({ success: false, error: budgetVal.error });
        return;
      }
    }

    const nowStr = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: nowStr };
    if (name) updates.name = name;
    if (totalBudget !== undefined) updates.total_budget = Number(totalBudget);
    if (occasion) updates.occasion = occasion;

    await eventRef.update(updates);

    await logAudit(
      req.admin!.username,
      'EVENT_CONFIG_UPDATE',
      `Cập nhật cấu hình: ${name || event?.name}, Ngân sách: ${totalBudget || event?.total_budget}`,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: 'Cập nhật cấu hình sự kiện thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Update Prize Tier with validation
 */
router.post('/admin/prizes/update', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotIndex, totalQuantity, remainingQuantity, probabilityWeight } = req.body;

    const validation = validatePrizeTierUpdate({
      totalQuantity: Number(totalQuantity),
      remainingQuantity: Number(remainingQuantity),
      probabilityWeight: probabilityWeight !== undefined ? Number(probabilityWeight) : undefined,
    });

    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const db = await getDb();
    const tierRef = db.collection('prize_tiers').doc(`slot_${slotIndex}`);

    const updates: Record<string, any> = {};
    if (totalQuantity !== undefined) updates.total_quantity = Number(totalQuantity);
    if (remainingQuantity !== undefined) updates.remaining_quantity = Number(remainingQuantity);
    if (probabilityWeight !== undefined) updates.probability_weight = Number(probabilityWeight);

    await tierRef.update(updates);

    await logAudit(
      req.admin!.username,
      'PRIZE_UPDATE',
      `Cập nhật ô số ${slotIndex}: tồn=${remainingQuantity}, tổng=${totalQuantity}`,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: 'Đã cập nhật giải thưởng!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: List & Search Tickets
 */
router.get('/admin/tickets', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const db = await getDb();

    const ticketsSnap = await db.collection('tickets').orderBy('created_at', 'desc').get();
    let tickets = ticketsSnap.docs.map((d) => d.data()!);

    if (status && status !== 'ALL') {
      tickets = tickets.filter((t) => t.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.trim().toUpperCase();
      tickets = tickets.filter((t) => t.code.includes(q));
    }

    const total = tickets.length;
    const paginated = tickets.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      tickets: paginated,
      total,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Batch Generate Tickets
 */
router.post('/admin/tickets/generate', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quantity = 10, prefix = 'SCH', occasion } = req.body;
    const qty = Math.min(500, Math.max(1, Number(quantity)));

    const db = await getDb();
    const eventSnap = await db.collection('event_config').doc('current').get();
    const targetOccasion = occasion || eventSnap.data()?.occasion || 'HOI_TRUONG_2026';
    const nowStr = new Date().toISOString();

    const generatedCodes: string[] = [];

    for (let i = 0; i < qty; i++) {
      const code = generateTicketCode(prefix);
      await db.collection('tickets').doc(code).set({
        code,
        occasion: targetOccasion,
        status: 'UNUSED',
        created_at: nowStr,
        used_at: null,
        used_by: null,
      });
      generatedCodes.push(code);
    }

    await logAudit(
      req.admin!.username,
      'GENERATE_TICKETS',
      `Phát hành lô ${qty} vé cho dịp ${targetOccasion}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      count: qty,
      tickets: generatedCodes,
      message: `Đã phát hành thành công ${qty} vé mới!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Revoke Unused Ticket
 */
router.post('/admin/tickets/revoke', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Thiếu mã vé' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const db = await getDb();
    const ticketRef = db.collection('tickets').doc(cleanCode);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      res.status(404).json({ success: false, error: 'Vé không tồn tại' });
      return;
    }

    const ticket = ticketSnap.data()!;
    if (ticket.status === 'USED') {
      res.status(400).json({ success: false, error: 'Không thể thu hồi vé đã sử dụng' });
      return;
    }

    await ticketRef.update({ status: 'REVOKED' });

    await logAudit(
      req.admin!.username,
      'REVOKE_TICKET',
      `Thu hồi vé: ${cleanCode}`,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: `Đã thu hồi vé ${cleanCode} thành công!` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: List & Search Claims
 */
router.get('/admin/claims', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const claimsSnap = await db.collection('claims').orderBy('created_at', 'desc').get();
    const claims = claimsSnap.docs.map((d) => {
      const c = d.data()!;
      return {
        ...c,
        prize_amount: Number(c.prize_amount),
      };
    });

    res.json({
      success: true,
      claims,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Update Claim Status with State Transition Validation
 */
router.post('/admin/claims/:code/update', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { status, adminNote, transactionRef } = req.body;

    const cleanCode = (code || '').trim().toUpperCase();
    const db = await getDb();

    await db.runTransaction(async (tx) => {
      const claimRef = db.collection('claims').doc(cleanCode);
      const claimSnap = await tx.get(claimRef);

      if (!claimSnap.exists) {
        throw new Error('Không tìm thấy yêu cầu nhận thưởng');
      }

      const claim = claimSnap.data()!;

      // State Transition Validation
      if (status && status !== claim.status) {
        if (!isValidClaimTransition(claim.status as ClaimStatus, status as ClaimStatus)) {
          throw new Error(
            `Không thể chuyển trạng thái từ [${claim.status}] sang [${status}]. Quy trình xử lý không hợp lệ!`
          );
        }
      }

      const nowStr = new Date().toISOString();
      const updates: Record<string, any> = { updated_at: nowStr };
      if (status) updates.status = status;
      if (adminNote !== undefined) updates.admin_note = adminNote;
      if (transactionRef !== undefined) updates.transaction_ref = transactionRef;

      tx.update(claimRef, updates);
    });

    await logAudit(
      req.admin!.username,
      'CLAIM_UPDATE',
      `Cập nhật Claim ${cleanCode}: trạng thái=${status}, mã GD=${transactionRef || ''}`,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: 'Đã cập nhật yêu cầu nhận thưởng thành công!' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Export Tickets CSV
 */
router.get('/admin/export/tickets', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const ticketsSnap = await db.collection('tickets').orderBy('created_at', 'desc').get();
    const tickets = ticketsSnap.docs.map((d) => d.data()!);

    let csv = 'Mã Vé,Dịp Sự Kiện,Trạng Thái,Thời Gian Tạo,Thời Gian Dùng,Người Dùng\n';
    for (const t of tickets) {
      csv += `"${t.code}","${t.occasion}","${t.status}","${t.created_at || ''}","${t.used_at || ''}","${t.used_by || ''}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=danh_sach_ve.csv');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: Export Claims CSV
 */
router.get('/admin/export/claims', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const claimsSnap = await db.collection('claims').orderBy('created_at', 'desc').get();
    const claims = claimsSnap.docs.map((d) => d.data()!);

    let csv =
      'Mã Nhận Thưởng,Mã Vé,Số Tiền,Họ Tên Học Sinh,Lớp/Đơn Vị,Số Điện Thoại,Hình Thức Nhận,Tài Khoản/SĐT MoMo,Trạng Thái,Ghi Chú Admin,Mã Giao Dịch,Thời Gian Tạo,Cập Nhật\n';
    for (const c of claims) {
      csv += `"${c.claim_code}","${c.ticket_code}","${c.prize_amount}","${c.student_name || ''}","${c.student_class || ''}","${c.phone || ''}","${c.payout_method || ''}","${c.payout_account || ''}","${c.status}","${c.admin_note || ''}","${c.transaction_ref || ''}","${c.created_at || ''}","${c.updated_at || ''}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=danh_sach_trung_thuong.csv');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin: View Audit Logs
 */
router.get('/admin/audit-logs', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const logsSnap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(100).get();
    const logs = logsSnap.docs.map((d) => d.data()!);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
