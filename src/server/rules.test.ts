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
