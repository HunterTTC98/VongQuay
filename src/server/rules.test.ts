import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHEEL_SLOTS,
  WISH_SLOT_INDICES,
  CASH_SLOT_INDICES,
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
} from './rules.ts';

test('WHEEL_SLOTS has exactly 8 alternating slots with expected amounts', () => {
  assert.equal(WHEEL_SLOTS.length, 8);
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      assert.equal(WHEEL_SLOTS[i].isCash, true);
      assert.ok(WHEEL_SLOTS[i].amount > 0);
    } else {
      assert.equal(WHEEL_SLOTS[i].isCash, false);
      assert.equal(WHEEL_SLOTS[i].amount, 0);
    }
  }
});

test('maskPhoneNumber properly masks middle digits', () => {
  assert.equal(maskPhoneNumber('0912345678'), '091****678');
  assert.equal(maskPhoneNumber('09876543210'), '098*****210');
  assert.equal(maskPhoneNumber(''), '***');
});

test('maskStudentName masks given name while preserving family name', () => {
  assert.equal(maskStudentName('Nguyễn Văn Nam'), 'Nguyễn V** N**');
  assert.equal(maskStudentName('Trần Bình'), 'Trần B***');
  assert.equal(maskStudentName(''), '***');
});

test('maskStudentClass masks class digits for privacy', () => {
  assert.equal(maskStudentClass('12A1'), '12**');
  assert.equal(maskStudentClass('10B'), '10**');
});

test('maskTransactionRef masks middle characters', () => {
  assert.equal(maskTransactionRef('FT26090123891'), 'FT26****891');
  assert.equal(maskTransactionRef(''), '');
});

test('generateTicketCode produces unique valid formatted codes', () => {
  const code1 = generateTicketCode('SCH');
  const code2 = generateTicketCode('SCH');
  assert.match(code1, /^SCH-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  assert.notEqual(code1, code2);
});

test('generateClaimCode produces valid CLM- prefix', () => {
  const claim = generateClaimCode();
  assert.match(claim, /^CLM-[2-9A-Z]{6}$/);
});

test('Claim State Machine transitions validate correctly', () => {
  // Valid transitions
  assert.equal(isValidClaimTransition('UNSUBMITTED', 'PENDING_VERIFICATION'), true);
  assert.equal(isValidClaimTransition('PENDING_VERIFICATION', 'VERIFIED'), true);
  assert.equal(isValidClaimTransition('VERIFIED', 'PENDING_PAYOUT'), true);
  assert.equal(isValidClaimTransition('PENDING_PAYOUT', 'PAID'), true);
  assert.equal(isValidClaimTransition('PENDING_VERIFICATION', 'REJECTED'), true);
  assert.equal(isValidClaimTransition('REJECTED', 'PENDING_VERIFICATION'), true);

  // Invalid transitions
  assert.equal(isValidClaimTransition('UNSUBMITTED', 'PAID'), false);
  assert.equal(isValidClaimTransition('PAID', 'PENDING_VERIFICATION'), false); // Cannot alter paid claim!
  assert.equal(isValidClaimTransition('PAID', 'REJECTED'), false);
});

test('validateBudgetUpdate prevents setting budget lower than used budget', () => {
  assert.equal(validateBudgetUpdate(3000000, 1000000).valid, true);
  assert.equal(validateBudgetUpdate(500000, 1000000).valid, false);
  assert.equal(validateBudgetUpdate(-100, 0).valid, false);
});

test('validatePrizeTierUpdate enforces non-negative and remaining <= total', () => {
  assert.equal(validatePrizeTierUpdate({ remainingQuantity: 10, totalQuantity: 20 }).valid, true);
  assert.equal(validatePrizeTierUpdate({ remainingQuantity: 25, totalQuantity: 20 }).valid, false);
  assert.equal(validatePrizeTierUpdate({ remainingQuantity: -1, totalQuantity: 10 }).valid, false);
});

test('FREE and TRIAL spins NEVER award cash or cash slots', () => {
  const mockPrizes = [
    { slot_index: 0, remaining: 10, amount: 10000, probability_weight: 50 },
    { slot_index: 2, remaining: 5, amount: 50000, probability_weight: 20 },
  ];

  for (let i = 0; i < 20; i++) {
    const freeOutcome = determineSpinOutcome({
      spinType: 'FREE',
      availablePrizes: mockPrizes,
      remainingBudget: 1000000,
    });
    assert.equal(freeOutcome.isCash, false);
    assert.equal(freeOutcome.amount, 0);
    assert.ok(WISH_SLOT_INDICES.includes(freeOutcome.slotIndex));
  }
});

test('Vercel rewrite query path normalization correctly formats express route', () => {
  function normalizeUrl(query: Record<string, any>, url: string): { url: string; query: Record<string, any> } {
    const rawPath = query?.path;
    const q = { ...query };
    let finalUrl = url;

    if (rawPath) {
      const subpath = Array.isArray(rawPath) ? rawPath[0] : rawPath;
      const cleanSubpath = String(subpath).replace(/^\/+/, '');
      delete q.path;

      const queryKeys = Object.keys(q);
      let queryString = '';
      if (queryKeys.length > 0) {
        const searchParams = new URLSearchParams();
        for (const key of queryKeys) {
          const val = q[key];
          if (Array.isArray(val)) {
            val.forEach((v) => searchParams.append(key, String(v)));
          } else if (val !== undefined && val !== null) {
            searchParams.append(key, String(val));
          }
        }
        const qs = searchParams.toString();
        if (qs) queryString = `?${qs}`;
      }
      finalUrl = `/api/${cleanSubpath}${queryString}`;
    } else if (finalUrl.startsWith('/api/index')) {
      finalUrl = finalUrl.replace(/^\/api\/index/, '/api');
    }
    return { url: finalUrl, query: q };
  }

  // 1. Standard API rewrite
  const r1 = normalizeUrl({ path: 'public/config' }, '/api/index?path=public/config');
  assert.equal(r1.url, '/api/public/config');
  assert.equal(r1.query.path, undefined);

  // 2. API rewrite with query parameters
  const r2 = normalizeUrl({ path: 'public/claims/search', code: 'CLM-ABC-123' }, '/api/index?path=public/claims/search&code=CLM-ABC-123');
  assert.equal(r2.url, '/api/public/claims/search?code=CLM-ABC-123');
  assert.equal(r2.query.code, 'CLM-ABC-123');
  assert.equal(r2.query.path, undefined);

  // 3. Fallback when called as /api/index
  const r3 = normalizeUrl({}, '/api/index');
  assert.equal(r3.url, '/api');
});

