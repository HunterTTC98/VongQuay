/**
 * Bách Khoa Events - Confession Text Moderation Engine
 * Senior Backend Node.js / TypeScript Implementation
 *
 * Core Features:
 * 1. Deep evasion resistance (punctuation splitting, whitespace injection, leetspeak, teencode, character flooding).
 * 2. Vietnamese diacritic & tone variant normalization.
 * 3. High-performance compiled Regex pattern caching with zero-leak memory management.
 * 4. Non-destructive contextual masking with merged overlap intervals.
 * 5. Full async/await support with granular severity action tiering.
 */

export interface BlacklistItem {
  word: string;
  level: number; // 1: Mild, 2: Moderate, 3: Severe
  category?: string;
}

export type SuggestedAction = 'APPROVED' | 'AUTO_MASK' | 'PENDING_MODERATION' | 'REJECTED';

export interface ModerationResult {
  is_clean: boolean;
  highest_level_detected: number;
  filtered_content: string;
  matched_words: string[];
  suggested_action: SuggestedAction;
}

export interface ModerationOptions {
  maskChar?: string;
  autoMaskLevel?: number; // Level threshold for AUTO_MASK (default: 1)
  pendingLevel?: number;  // Level threshold for PENDING_MODERATION (default: 2)
  rejectLevel?: number;   // Level threshold for REJECTED (default: 3)
  strictMode?: boolean;   // Phương án A: Tự động từ chối bất kỳ vi phạm từ ngữ thô tục/viết tắt nào
}

// Map of common Vietnamese leetspeak / teencode character substitutions
const TEENCODE_CHAR_MAP: Record<string, string> = {
  a: '[aáàảãạăắằẳẵặâấầẩẫậ4@]',
  b: '[b8]',
  c: '[ckq]',
  d: '(?:dz|[dđz])',
  e: '[eéèẻẽẹêếềểễệ3]',
  g: '[g]',
  h: '[h]',
  i: '[iíìỉĩịj1!]',
  k: '[ckq]',
  l: '[l1|]',
  m: '[m]',
  n: '[n]',
  o: '[oóòỏõọôốồổỗộơớờởỡợ0w]',
  p: '[p]',
  q: '[kq]',
  r: '[r]',
  s: '[s5$]',
  t: '[t7+]',
  u: '[uúùủũụưứừửữựw]',
  v: '[v]',
  x: '[x]',
  y: '[yýỳỷỹỵj]',
};

// Separators students inject between letters to bypass filters (e.g. đ.m, v_c_l, c*a*c)
const EVASION_SEPARATORS = `[\\s\\._\\-\\*,~\\/\\\\:;|'"\`^+=!#$%\u200B-\u200D\uFEFF]*`;

// LRU / Map Regex compilation cache to avoid recompiling heavy regexes across repeated requests
const REGEX_CACHE = new Map<string, RegExp>();
const MAX_CACHE_SIZE = 1000;

/**
 * Remove Vietnamese accents to create base-ASCII representation
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

/**
 * Compiles a blacklisted word into an evasion-resilient Regular Expression
 * Handles:
 * - Leetspeak & teencode (j -> i, z -> d/gi, 4 -> a, 3 -> e, 0 -> o)
 * - Repeated characters (đmmmm, vclllll)
 * - Injected separators (đ.m, v_c_l, c-a-c)
 * - Case insensitivity
 */
export function buildEvasionRegex(word: string): RegExp {
  const normalizedWord = word.trim().toLowerCase();
  const cached = REGEX_CACHE.get(normalizedWord);
  if (cached) return cached;

  // Split into tokens if blacklist term contains multiple words
  const tokens = normalizedWord.split(/\s+/).filter(Boolean);

  const tokenPatterns = tokens.map((token) => {
    const rawChars = removeVietnameseAccents(token).split('');
    const charPatterns: string[] = [];

    for (let i = 0; i < rawChars.length; i++) {
      const ch = rawChars[i];
      // Special handle common Vietnamese two-char clusters like "ph" -> (ph|f)
      if (ch === 'p' && i + 1 < rawChars.length && rawChars[i + 1] === 'h') {
        charPatterns.push('(?:ph|f)+');
        i++; // skip 'h'
        continue;
      }
      if (ch === 't' && i + 1 < rawChars.length && rawChars[i + 1] === 'h') {
        charPatterns.push('(?:th)+');
        i++;
        continue;
      }

      const pattern = TEENCODE_CHAR_MAP[ch] || `[${ch}]`;
      // Allow character elongation (e.g. mmmm, llll)
      charPatterns.push(`${pattern}+`);
    }

    // Join characters with optional evasion separators
    return charPatterns.join(EVASION_SEPARATORS);
  });

  // Between words, allow spaces or separators
  const combinedPattern = tokenPatterns.join(`(?:${EVASION_SEPARATORS}|\\s+)`);

  // Word boundary assertion supporting Unicode Vietnamese boundaries
  // (?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])
  const fullRegexStr = `(?<![\\p{L}\\p{N}])${combinedPattern}(?![\\p{L}\\p{N}])`;
  const compiled = new RegExp(fullRegexStr, 'gsiu');

  // Cache management
  if (REGEX_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = REGEX_CACHE.keys().next().value;
    if (firstKey) REGEX_CACHE.delete(firstKey);
  }
  REGEX_CACHE.set(normalizedWord, compiled);

  return compiled;
}

interface MatchInterval {
  start: number;
  end: number;
  word: string;
  level: number;
}

/**
 * Merge overlapping intervals to safely mask text without indexing collisions
 */
function mergeIntervals(intervals: MatchInterval[]): MatchInterval[] {
  if (intervals.length <= 1) return intervals;

  const sorted = [...intervals].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: MatchInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.start <= prev.end) {
      // Overlap detected: extend end and preserve highest level
      prev.end = Math.max(prev.end, curr.end);
      prev.level = Math.max(prev.level, curr.level);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Synchronous core text moderation engine
 */
export function moderateConfessionTextSync(
  content: string,
  blacklist: BlacklistItem[],
  options: ModerationOptions = {}
): ModerationResult {
  const {
    maskChar = '*',
    autoMaskLevel = 1,
    pendingLevel = 2,
    rejectLevel = 3,
  } = options;

  if (!content || typeof content !== 'string') {
    return {
      is_clean: true,
      highest_level_detected: 0,
      filtered_content: '',
      matched_words: [],
      suggested_action: 'APPROVED',
    };
  }

  if (!Array.isArray(blacklist) || blacklist.length === 0) {
    return {
      is_clean: true,
      highest_level_detected: 0,
      filtered_content: content,
      matched_words: [],
      suggested_action: 'APPROVED',
    };
  }

  const matches: MatchInterval[] = [];
  const matchedWordsSet = new Set<string>();
  let highestLevel = 0;

  // Scan content against each blacklisted word
  for (let i = 0; i < blacklist.length; i++) {
    const item = blacklist[i];
    if (!item.word || !item.word.trim()) continue;

    const regex = buildEvasionRegex(item.word);
    regex.lastIndex = 0; // Reset stateful regex pointer

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;

      matches.push({
        start,
        end,
        word: item.word,
        level: item.level || 1,
      });

      matchedWordsSet.add(item.word);
      if ((item.level || 1) > highestLevel) {
        highestLevel = item.level || 1;
      }

      // Avoid infinite loop on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  // If no violations found
  if (matches.length === 0) {
    return {
      is_clean: true,
      highest_level_detected: 0,
      filtered_content: content,
      matched_words: [],
      suggested_action: 'APPROVED',
    };
  }

  // Merge overlapping and adjacent matched intervals
  const mergedIntervals = mergeIntervals(matches);

  // Construct masked string preserving surrounding text and format
  let filteredContent = '';
  let cursor = 0;

  for (const interval of mergedIntervals) {
    // Append clean slice preceding the match
    filteredContent += content.slice(cursor, interval.start);

    // Append masked replacement
    const matchLength = interval.end - interval.start;
    filteredContent += maskChar.repeat(matchLength);

    cursor = interval.end;
  }

  // Append any trailing clean text
  if (cursor < content.length) {
    filteredContent += content.slice(cursor);
  }

  // Determine suggested action based on configured level thresholds
  let suggestedAction: SuggestedAction = 'PENDING_MODERATION';
  if (options.strictMode) {
    // Phương án A: Chặn cứng tuyệt đối, không chấp nhận bất kỳ từ viết tắt/tục tĩu nào
    suggestedAction = 'REJECTED';
  } else if (highestLevel >= rejectLevel) {
    suggestedAction = 'REJECTED';
  } else if (highestLevel === pendingLevel) {
    suggestedAction = 'PENDING_MODERATION';
  } else if (highestLevel <= autoMaskLevel) {
    suggestedAction = 'AUTO_MASK';
  }

  return {
    is_clean: false,
    highest_level_detected: highestLevel,
    filtered_content: filteredContent,
    matched_words: Array.from(matchedWordsSet),
    suggested_action: suggestedAction,
  };
}

/**
 * Asynchronous Text Moderation function for Confession processing in Node.js
 * Supports direct array or Promise-based blacklist from Firestore / Cloud SQL
 */
export async function moderateConfessionText(
  content: string,
  blacklist: BlacklistItem[] | Promise<BlacklistItem[]>,
  options: ModerationOptions = {}
): Promise<ModerationResult> {
  // Await blacklist if passed as a Promise (e.g. from async DB query)
  const resolvedBlacklist = await Promise.resolve(blacklist);

  // Non-blocking processing
  return moderateConfessionTextSync(content, resolvedBlacklist, options);
}

/**
 * Danh mục từ cấm & từ viết tắt lách luật học đường (Trường TC Công nghiệp Bách Khoa Sầm Sơn)
 * Bao quát toàn diện các mánh khóe viết tắt, teencode, tục tĩu
 */
export const DEFAULT_SCHOOL_BLACKLIST: BlacklistItem[] = [
  // 1. Nhóm từ viết tắt lóng thô tục (Abbreviation / Slang)
  { word: 'vcl', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vkl', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vl', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vch', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vcc', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vcln', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vck', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'vclm', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'clgt', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'đcl', level: 3, category: 'SLANG_ABBREVIATION' },
  { word: 'dcl', level: 3, category: 'SLANG_ABBREVIATION' },

  // 2. Nhóm văng tục Đ-M / D-M
  { word: 'đm', level: 3, category: 'PROFANITY' },
  { word: 'dm', level: 3, category: 'PROFANITY' },
  { word: 'đmm', level: 3, category: 'PROFANITY' },
  { word: 'dmm', level: 3, category: 'PROFANITY' },
  { word: 'đcm', level: 3, category: 'PROFANITY' },
  { word: 'dcm', level: 3, category: 'PROFANITY' },
  { word: 'đkm', level: 3, category: 'PROFANITY' },
  { word: 'dkm', level: 3, category: 'PROFANITY' },

  // 3. Nhóm từ tục tĩu bộ phận / tình dục / chửi thề
  { word: 'địt', level: 3, category: 'PROFANITY' },
  { word: 'dit', level: 3, category: 'PROFANITY' },
  { word: 'djt', level: 3, category: 'PROFANITY' },
  { word: 'đệt', level: 2, category: 'SLANG' },
  { word: 'đéo', level: 3, category: 'PROFANITY' },
  { word: 'deo', level: 3, category: 'PROFANITY' },
  { word: 'đíu', level: 2, category: 'SLANG' },
  { word: 'diu', level: 2, category: 'SLANG' },
  { word: 'đụt', level: 2, category: 'SLANG' },
  { word: 'cặc', level: 3, category: 'EXPLICIT' },
  { word: 'cac', level: 3, category: 'EXPLICIT' },
  { word: 'kac', level: 3, category: 'EXPLICIT' },
  { word: 'kak', level: 3, category: 'EXPLICIT' },
  { word: 'lồn', level: 3, category: 'EXPLICIT' },
  { word: 'lon', level: 3, category: 'EXPLICIT' },
  { word: 'loz', level: 3, category: 'EXPLICIT' },
  { word: 'lwn', level: 3, category: 'EXPLICIT' },
  { word: 'buồi', level: 3, category: 'EXPLICIT' },
  { word: 'buoi', level: 3, category: 'EXPLICIT' },
  { word: 'bùi', level: 2, category: 'EXPLICIT' },

  // 4. Nhóm xúc phạm nhân phẩm, lăng mạ
  { word: 'đĩ', level: 3, category: 'INSULT' },
  { word: 'phò', level: 3, category: 'INSULT' },
  { word: 'chó đẻ', level: 3, category: 'INSULT' },
  { word: 'súc vật', level: 3, category: 'INSULT' },
  { word: 'suc vat', level: 3, category: 'INSULT' },
  { word: 'óc chó', level: 3, category: 'INSULT' },
  { word: 'oc cho', level: 3, category: 'INSULT' },
  { word: 'ngu vcl', level: 3, category: 'INSULT' },
  { word: 'ngu vkl', level: 3, category: 'INSULT' },
  { word: 'mẹ mày', level: 3, category: 'INSULT' },
  { word: 'me may', level: 3, category: 'INSULT' },
  { word: 'bố mày', level: 2, category: 'INSULT' },
  { word: 'bo may', level: 2, category: 'INSULT' },
];

/**
 * Kiểm tra xác thực bài đăng Confession chuẩn Phương án A (Hard Reject Guard)
 */
export function validateConfessionSubmission(
  content: string,
  blacklist: BlacklistItem[] = DEFAULT_SCHOOL_BLACKLIST
): {
  isValid: boolean;
  errorMessage?: string;
  matchedWords: string[];
  moderation: ModerationResult;
} {
  const result = moderateConfessionTextSync(content, blacklist, { strictMode: true });

  if (!result.is_clean) {
    const wordsDisplay = result.matched_words.map((w) => `"${w.toUpperCase()}"`).join(', ');
    return {
      isValid: false,
      errorMessage: `Nội dung chứa từ ngữ/từ viết tắt không phù hợp học đường (${wordsDisplay}). Trường Bách Khoa yêu cầu giữ gìn sự trong sáng của tiếng Việt và nét đẹp văn hóa học đường. Vui lòng sửa lại lời nhắn văn minh để được nhận lượt quay!`,
      matchedWords: result.matched_words,
      moderation: result,
    };
  }

  return {
    isValid: true,
    matchedWords: [],
    moderation: result,
  };
}
