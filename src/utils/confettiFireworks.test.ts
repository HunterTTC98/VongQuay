import test from 'node:test';
import assert from 'node:assert/strict';
import { isCashPrizeOutcome, isGrandCashPrize } from './confettiFireworks.ts';

test('isCashPrizeOutcome correctly identifies winning cash prizes', () => {
  // Cash win with positive amount
  assert.equal(
    isCashPrizeOutcome({ isWin: true, amount: 20000, isTrial: false }),
    true
  );

  // Cash win with claimCode
  assert.equal(
    isCashPrizeOutcome({ isWin: true, amount: 100000, claimCode: 'SCH-WIN100' }),
    true
  );

  // Trial spin should never trigger cash fireworks
  assert.equal(
    isCashPrizeOutcome({ isWin: true, amount: 50000, isTrial: true }),
    false
  );

  // Amount 0 (wishes / motivational slogans) should not trigger cash fireworks
  assert.equal(
    isCashPrizeOutcome({ isWin: true, amount: 0, isTrial: false }),
    false
  );

  // Losses / not winning
  assert.equal(
    isCashPrizeOutcome({ isWin: false, amount: 0 }),
    false
  );

  // Null or undefined
  assert.equal(isCashPrizeOutcome(null), false);
  assert.equal(isCashPrizeOutcome(undefined), false);
});

test('isGrandCashPrize identifies special high value grand prizes', () => {
  assert.equal(isGrandCashPrize(100000), true);
  assert.equal(isGrandCashPrize(200000), true);
  assert.equal(isGrandCashPrize(50000), false);
  assert.equal(isGrandCashPrize(10000), false);
  assert.equal(isGrandCashPrize(0), false);
  assert.equal(isGrandCashPrize(undefined), false);
});
