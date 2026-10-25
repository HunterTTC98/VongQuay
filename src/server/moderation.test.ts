import test from 'node:test';
import assert from 'node:assert/strict';
import {
  moderateConfessionText,
  moderateConfessionTextSync,
  buildEvasionRegex,
  validateConfessionSubmission,
  DEFAULT_SCHOOL_BLACKLIST,
  BlacklistItem,
} from './moderation.ts';

test('Phương án A - User exact case "VCL tại sao lại thế" is strictly REJECTED', () => {
  const content = 'VCL tại sao lại thế';
  const validation = validateConfessionSubmission(content, DEFAULT_SCHOOL_BLACKLIST);

  assert.equal(validation.isValid, false);
  assert.ok(validation.matchedWords.includes('vcl'));
  assert.equal(validation.moderation.is_clean, false);
  assert.equal(validation.moderation.suggested_action, 'REJECTED');
  assert.ok(validation.errorMessage?.includes('VCL'));
});

test('Phương án A - Punctuation variants "v.c.l", "v_c_l", "VKL" are all REJECTED', () => {
  const variants = [
    'v.c.l tại sao lại thế',
    'v_c_l tại sao lại thế',
    'VKL tại sao lại thế',
    'vch tại sao lại thế',
    'đ.m tại sao lại thế',
  ];

  for (const text of variants) {
    const validation = validateConfessionSubmission(text, DEFAULT_SCHOOL_BLACKLIST);
    assert.equal(validation.isValid, false, `Failed to reject: ${text}`);
    assert.equal(validation.moderation.suggested_action, 'REJECTED');
  }
});

test('Text Moderation - Clean wholesome confession passes with APPROVED', async () => {
  const content = 'Kính chúc Thầy Cô K15 luôn mạnh khỏe, tràn đầy nhiệt huyết trên bục giảng Bách Khoa!';
  const result = await moderateConfessionText(content, DEFAULT_SCHOOL_BLACKLIST);

  assert.equal(result.is_clean, true);
  assert.equal(result.highest_level_detected, 0);
  assert.equal(result.filtered_content, content);
  assert.deepEqual(result.matched_words, []);
  assert.equal(result.suggested_action, 'APPROVED');
});

test('Text Moderation - Detects punctuation-separated evasion (đ.m, v_c_l)', async () => {
  const customBlacklist: BlacklistItem[] = [
    { word: 'đm', level: 2 },
    { word: 'vcl', level: 1 },
  ];

  const content = 'Cái thằng đ.m kia nhìn rất v_c_l';
  const result = await moderateConfessionText(content, customBlacklist);

  assert.equal(result.is_clean, false);
  assert.equal(result.highest_level_detected, 2);
  assert.equal(result.filtered_content, 'Cái thằng *** kia nhìn rất *****');
  assert.ok(result.matched_words.includes('đm'));
  assert.ok(result.matched_words.includes('vcl'));
  assert.equal(result.suggested_action, 'PENDING_MODERATION');
});

test('Text Moderation - Detects teencode substitutions (j for i, z for d, 4 for a)', async () => {
  const customBlacklist: BlacklistItem[] = [
    { word: 'dit', level: 2 },
    { word: 'cac', level: 3 },
  ];

  // Teencode: djt (j replaces i), k4c (k replaces c, 4 replaces a)
  const content = 'Nó dám djt bậy rồi còn k4c nữa';
  const result = await moderateConfessionText(content, customBlacklist);

  assert.equal(result.is_clean, false);
  assert.equal(result.highest_level_detected, 3);
  assert.ok(result.matched_words.includes('dit'));
  assert.ok(result.matched_words.includes('cac'));
  assert.equal(result.suggested_action, 'REJECTED');
  assert.equal(result.filtered_content, 'Nó dám *** bậy rồi còn *** nữa');
});

test('Text Moderation - Handles character elongation flooding (đmmmmmm, vcllllll)', async () => {
  const customBlacklist: BlacklistItem[] = [
    { word: 'đm', level: 2 },
    { word: 'vcl', level: 1 },
  ];

  // 'đmmmmmm' has length 7 -> '*******'
  // 'vcllllll' has length 8 -> '********'
  const content = 'Cay đmmmmmm quá vcllllll';
  const result = await moderateConfessionText(content, customBlacklist);

  assert.equal(result.is_clean, false);
  assert.equal(result.filtered_content, 'Cay ******* quá ********');
  assert.ok(result.matched_words.includes('đm'));
  assert.ok(result.matched_words.includes('vcl'));
});

test('Text Moderation - Async database blacklist fetching works with Promise input', async () => {
  const mockDbQuery = async (): Promise<BlacklistItem[]> => {
    // Simulates an async DB call (e.g. firestore.collection('blacklist').get())
    return [
      { word: 'thô tục 1', level: 2 },
      { word: 'thô tục 2', level: 2 },
    ];
  };

  const content = 'Bài viết chứa thô tục 1 và cả thô tục 2';
  const result = await moderateConfessionText(content, mockDbQuery());

  assert.equal(result.is_clean, false);
  assert.equal(result.highest_level_detected, 2);
  assert.deepEqual(result.matched_words, ['thô tục 1', 'thô tục 2']);
  assert.equal(result.suggested_action, 'PENDING_MODERATION');
  assert.equal(result.filtered_content, 'Bài viết chứa ********* và cả *********');
});

test('Text Moderation - Exact boundary preservation prevents false positives on clean words', async () => {
  const customBlacklist: BlacklistItem[] = [
    { word: 'dm', level: 2 },
  ];

  // "admin" contains letters d and m, but should NOT be matched due to word boundary
  const content = 'Em xin gửi lời chào admin và ban giám hiệu';
  const result = await moderateConfessionText(content, customBlacklist);

  assert.equal(result.is_clean, true);
  assert.equal(result.filtered_content, content);
  assert.equal(result.suggested_action, 'APPROVED');
});

test('Text Moderation - Merges overlapping matched intervals cleanly', () => {
  const customBlacklist: BlacklistItem[] = [
    { word: 'địt mẹ', level: 2 },
    { word: 'mẹ', level: 1 },
  ];

  // 'đ.ị.t m.ẹ' has length 9 -> '*********'
  const content = 'Thằng kia đ.ị.t m.ẹ mày';
  const result = moderateConfessionTextSync(content, customBlacklist);

  assert.equal(result.is_clean, false);
  assert.equal(result.highest_level_detected, 2);
  assert.equal(result.filtered_content, 'Thằng kia ********* mày');
});
