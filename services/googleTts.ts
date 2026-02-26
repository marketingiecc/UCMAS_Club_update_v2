import { SUPABASE_URL } from '../config/env';

function baseLang(lang: string) {
  return (lang || 'vi').split('-')[0]; // vi-VN -> vi
}

const DEFAULT_VI_CLOUD_VOICE = 'vi-VN-Standard-A';

/** Digits 0-9 in Vietnamese (for reading numbers). */
const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;

/** Chỉ trim khoảng im lặng ở các token SỐ (0–9). Giữ nguyên nghìn, triệu, tỷ, mươi, trăm… để học sinh nghe rõ. */
const TRIM_DIGIT_TOKENS = new Set<string>(VI_DIGITS);

/**
 * Convert a number to Vietnamese words for TTS (so "12" is read as "mười hai" not "twelve").
 * Handles integers and decimals (e.g. 3.5 -> "ba phẩy năm").
 */
export function numberToVietnameseWords(n: number): string {
  if (!Number.isFinite(n)) return 'không';
  if (n < 0) return 'trừ ' + numberToVietnameseWords(-n);

  const intPart = Math.floor(n);
  const fracPart = n - intPart;

  if (fracPart > 1e-9) {
    const fracStr = fracPart.toFixed(6).replace(/^0\./, '').replace(/0+$/, '');
    const intWords = numberToVietnameseWords(intPart);
    const fracWords = fracStr.split('').map(d => VI_DIGITS[parseInt(d, 10)]).join(' ');
    return fracWords ? `${intWords} phẩy ${fracWords}` : intWords;
  }

  const x = intPart;
  if (x <= 9) return VI_DIGITS[x];
  if (x <= 19) {
    if (x === 10) return 'mười';
    const u = x % 10;
    if (u === 5) return 'mười lăm';
    return 'mười ' + VI_DIGITS[u];
  }
  if (x <= 99) {
    const tens = Math.floor(x / 10);
    const u = x % 10;
    const t = tens === 1 ? 'mười' : VI_DIGITS[tens] + ' mươi';
    if (u === 0) return t;
    if (u === 1) return t + ' mốt';
    if (u === 5) return t + ' lăm';
    return t + ' ' + VI_DIGITS[u];
  }
  if (x <= 999) {
    const hundreds = Math.floor(x / 100);
    const rest = x % 100;
    const h = VI_DIGITS[hundreds] + ' trăm';
    if (rest === 0) return h;
    if (rest <= 9) return h + ' linh ' + VI_DIGITS[rest];
    return h + ' ' + numberToVietnameseWords(rest);
  }
  if (x <= 999_999) {
    const thousands = Math.floor(x / 1000);
    const rest = x % 1000;
    const k = thousands <= 9 ? VI_DIGITS[thousands] + ' nghìn' : numberToVietnameseWords(thousands) + ' nghìn';
    if (rest === 0) return k;
    if (rest <= 99) return k + ' linh ' + numberToVietnameseWords(rest);
    return k + ' ' + numberToVietnameseWords(rest);
  }
  if (x <= 999_999_999) {
    const millions = Math.floor(x / 1_000_000);
    const rest = x % 1_000_000;
    const m = millions <= 9 ? VI_DIGITS[millions] + ' triệu' : numberToVietnameseWords(millions) + ' triệu';
    if (rest === 0) return m;
    if (rest <= 99) return m + ' linh ' + numberToVietnameseWords(rest);
    return m + ' ' + numberToVietnameseWords(rest);
  }
  if (x <= 999_999_999_999) {
    const billions = Math.floor(x / 1_000_000_000);
    const rest = x % 1_000_000_000;
    const b = billions <= 9 ? VI_DIGITS[billions] + ' tỷ' : numberToVietnameseWords(billions) + ' tỷ';
    if (rest === 0) return b;
    if (rest <= 99) return b + ' linh ' + numberToVietnameseWords(rest);
    return b + ' ' + numberToVietnameseWords(rest);
  }
  // Fallback for very large numbers: spell digits
  return String(x).split('').map(d => VI_DIGITS[parseInt(d, 10)]).join(' ');
}

/** Map token → filename (no diacritics, for static assets). */
const TOKEN_TO_FILENAME: Record<string, string> = {
  không: 'khong', một: 'mot', hai: 'hai', ba: 'ba', bốn: 'bon', năm: 'nam',
  sáu: 'sau', bảy: 'bay', tám: 'tam', chín: 'chin',
  mười: 'muoi', mươi: 'muoi2', mốt: 'mot2', lăm: 'lam', linh: 'linh',
  trăm: 'tram', nghìn: 'nghin', triệu: 'trieu', tỷ: 'ty',
  cộng: 'cong', trừ: 'tru', nhân: 'nhan', chia: 'chia',
  phẩy: 'phay', Chuẩn_bị: 'chuan_bi', Bằng: 'bang', _comma: '_comma',
};

export function tokenToFilename(token: string): string {
  return TOKEN_TO_FILENAME[token] ?? token.toLowerCase().replace(/\s+/g, '_').replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, (c) => {
    const m: Record<string, string> = { à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a', â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a', è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e', ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e', ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i', ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o', ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o', ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u', ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y', đ: 'd' };
    return m[c] ?? c;
  });
}

function numberToVietnameseTokensInner(x: number): string[] {
  if (x <= 9) return [VI_DIGITS[x]];
  if (x <= 19) {
    if (x === 10) return ['mười'];
    const u = x % 10;
    if (u === 5) return ['mười', 'lăm'];
    return ['mười', VI_DIGITS[u]];
  }
  if (x <= 99) {
    const tens = Math.floor(x / 10);
    const u = x % 10;
    const t = tens === 1 ? 'mười' : VI_DIGITS[tens] + ' mươi';
    const tTokens = tens === 1 ? ['mười'] : [VI_DIGITS[tens], 'mươi'];
    if (u === 0) return tTokens;
    if (u === 1) return [...tTokens, 'mốt'];
    if (u === 5) return [...tTokens, 'lăm'];
    return [...tTokens, VI_DIGITS[u]];
  }
  if (x <= 999) {
    const hundreds = Math.floor(x / 100);
    const rest = x % 100;
    const h = [VI_DIGITS[hundreds], 'trăm'];
    if (rest === 0) return h;
    if (rest <= 9) return [...h, 'linh', VI_DIGITS[rest]];
    return [...h, ...numberToVietnameseTokensInner(rest)];
  }
  if (x <= 999_999) {
    const thousands = Math.floor(x / 1000);
    const rest = x % 1000;
    const k = thousands <= 9 ? [VI_DIGITS[thousands], 'nghìn'] : [...numberToVietnameseTokensInner(thousands), 'nghìn'];
    if (rest === 0) return k;
    if (rest <= 99) return [...k, 'linh', ...numberToVietnameseTokensInner(rest)];
    return [...k, ...numberToVietnameseTokensInner(rest)];
  }
  if (x <= 999_999_999) {
    const millions = Math.floor(x / 1_000_000);
    const rest = x % 1_000_000;
    const m = millions <= 9 ? [VI_DIGITS[millions], 'triệu'] : [...numberToVietnameseTokensInner(millions), 'triệu'];
    if (rest === 0) return m;
    if (rest <= 99) return [...m, 'linh', ...numberToVietnameseTokensInner(rest)];
    return [...m, ...numberToVietnameseTokensInner(rest)];
  }
  if (x <= 999_999_999_999) {
    const billions = Math.floor(x / 1_000_000_000);
    const rest = x % 1_000_000_000;
    const b = billions <= 9 ? [VI_DIGITS[billions], 'tỷ'] : [...numberToVietnameseTokensInner(billions), 'tỷ'];
    if (rest === 0) return b;
    if (rest <= 99) return [...b, 'linh', ...numberToVietnameseTokensInner(rest)];
    return [...b, ...numberToVietnameseTokensInner(rest)];
  }
  return String(x).split('').map(d => VI_DIGITS[parseInt(d, 10)]);
}

/**
 * Convert a number to an array of Vietnamese tokens for concatenative TTS.
 */
export function numberToVietnameseTokens(n: number): string[] {
  if (!Number.isFinite(n)) return ['không'];
  if (n < 0) return ['trừ', ...numberToVietnameseTokensInner(-n)];
  return numberToVietnameseTokensInner(Math.floor(n));
}

export type ListeningOp = 'addsub' | 'mul' | 'div';

/**
 * Build token sequence for listening phrase: [Chuẩn_bị, ...calc, Bằng].
 * addsub: operands as signed numbers (UCMAS cộng/trừ).
 * mul/div: operands as [a, b] for "a nhân/chia b".
 *
 * UCMAS Nghe tính reading rules (không đọc dấu phẩy):
 * - Same sign consecutively: read operator once, numbers flow without pause. VD: [8,5,3] → tám cộng năm ba
 * - Sign change: read "cộng" or "trừ" before number. VD: [8,5,-2] → tám cộng năm trừ hai
 * - numberToVietnameseTokens handles special cases: mười lăm (15), mốt (21), lăm (25), linh (105)
 */
export function operandsToTokenSequence(operands: number[], op: ListeningOp = 'addsub'): string[] {
  const tokens: string[] = ['Chuẩn_bị'];
  if (op === 'addsub') {
    if (!operands.length) return tokens;
    let prevOp: '+' | '-' | null = null;
    for (let i = 0; i < operands.length; i++) {
      const n = operands[i];
      const sign: '+' | '-' = n >= 0 ? '+' : '-';
      const absVal = Math.abs(n);
      const numTokens = numberToVietnameseTokens(absVal);
      if (i === 0) {
        tokens.push(...numTokens);
      } else {
        if (sign === prevOp) {
          tokens.push(...numTokens);
        } else {
          tokens.push(sign === '+' ? 'cộng' : 'trừ');
          tokens.push(...numTokens);
        }
      }
      prevOp = sign;
    }
  } else if (op === 'mul' && operands.length >= 2) {
    tokens.push(...numberToVietnameseTokens(operands[0]), 'nhân', ...numberToVietnameseTokens(operands[1]));
  } else if (op === 'div' && operands.length >= 2) {
    tokens.push(...numberToVietnameseTokens(operands[0]), 'chia', ...numberToVietnameseTokens(operands[1]));
  }
  tokens.push('Bằng');
  return tokens;
}

/**
 * Trả về tokens và loại khoảng chờ sau mỗi token (để điều khiển pause khi ghép âm).
 */
export function operandsToTokensWithGapTypes(operands: number[], op: ListeningOp = 'addsub'): { tokens: string[]; gapAfter: NgheTinhGapType[] } {
  const tokens: string[] = [];
  const gapAfter: NgheTinhGapType[] = [];
  const push = (t: string, gap: NgheTinhGapType) => { tokens.push(t); gapAfter.push(gap); };

  if (op === 'addsub' && operands.length > 0) {
    push('Chuẩn_bị', 'chuan_bi');
    let prevOp: '+' | '-' | null = null;
    for (let i = 0; i < operands.length; i++) {
      const n = operands[i];
      const sign: '+' | '-' = n >= 0 ? '+' : '-';
      const absVal = Math.abs(n);
      const numTokens = numberToVietnameseTokens(absVal);
      if (i === 0) {
        for (let j = 0; j < numTokens.length; j++) {
          const isLastInNumber = j === numTokens.length - 1;
          const nextOpHasOperator = operands.length > 1;
          push(numTokens[j], isLastInNumber && nextOpHasOperator ? 'between_operands' : isLastInNumber ? 'none' : 'within_number');
        }
      } else {
        if (sign === prevOp) {
          for (let j = 0; j < numTokens.length; j++) {
            const isLastInNumber = j === numTokens.length - 1;
            const hasMore = i < operands.length - 1;
            push(numTokens[j], isLastInNumber && hasMore ? 'between_operands' : isLastInNumber ? 'none' : 'within_number');
          }
        } else {
          push(sign === '+' ? 'cộng' : 'trừ', 'after_operator');
          for (let j = 0; j < numTokens.length; j++) {
            const isLastInNumber = j === numTokens.length - 1;
            const hasMore = i < operands.length - 1;
            push(numTokens[j], isLastInNumber && hasMore ? 'between_operands' : isLastInNumber ? 'none' : 'within_number');
          }
        }
      }
      prevOp = sign;
    }
    push('Bằng', 'none');
  } else if (op === 'mul' && operands.length >= 2) {
    push('Chuẩn_bị', 'chuan_bi');
    const t0 = numberToVietnameseTokens(operands[0]);
    t0.forEach((t, j) => push(t, j < t0.length - 1 ? 'within_number' : 'after_operator'));
    push('nhân', 'after_operator');
    const t1 = numberToVietnameseTokens(operands[1]);
    t1.forEach((t, j) => push(t, j < t1.length - 1 ? 'within_number' : 'none'));
    push('Bằng', 'none');
  } else if (op === 'div' && operands.length >= 2) {
    push('Chuẩn_bị', 'chuan_bi');
    const t0 = numberToVietnameseTokens(operands[0]);
    t0.forEach((t, j) => push(t, j < t0.length - 1 ? 'within_number' : 'after_operator'));
    push('chia', 'after_operator');
    const t1 = numberToVietnameseTokens(operands[1]);
    t1.forEach((t, j) => push(t, j < t1.length - 1 ? 'within_number' : 'none'));
    push('Bằng', 'none');
  } else {
    push('Chuẩn_bị', 'none');
  }
  return { tokens, gapAfter };
}

/**
 * Chuyển operands thành câu đọc theo quy tắc UCMAS Nghe tính (không đọc dấu phẩy):
 * - Dấu cộng/trừ giống nhau liên tiếp: chỉ đọc 1 lần dấu, số nối tiếp không pause
 * - Đổi dấu: đọc "cộng" hoặc "trừ" trước số
 * VD: [8,5,3,-2,-1,7,4] → "tám cộng năm ba trừ hai một cộng bảy bốn"
 */
export function operandsToUcmasListeningPhraseVi(operands: number[]): string {
  if (!operands.length) return '';
  const parts: string[] = [];
  let prevOp: '+' | '-' | null = null;
  for (let i = 0; i < operands.length; i++) {
    const n = operands[i];
    const op: '+' | '-' = n >= 0 ? '+' : '-';
    const absVal = Math.abs(n);
    const numWord = numberToVietnameseWords(absVal);
    if (i === 0) {
      parts.push(numWord);
    } else {
      if (op === prevOp) {
        parts.push(` ${numWord}`);
      } else {
        const opWord = op === '+' ? 'cộng' : 'trừ';
        parts.push(` ${opWord} ${numWord}`);
      }
    }
    prevOp = op;
  }
  return parts.join('');
}

/**
 * Build the Vietnamese listening phrase for Nghe tính: "Chuẩn bị. [UCMAS phrase]. Bằng."
 */
export function buildListeningPhraseVi(operands: number[]): string {
  const calc = operandsToUcmasListeningPhraseVi(operands);
  return `Chuẩn bị. ${calc}. Bằng.`;
}

/**
 * Các loại khoảng chờ khi đọc phép tính ghép âm (UCMAS):
 * - chuan_bi: sau "Chuẩn bị", trước phép tính
 * - within_number: giữa các chữ trong 1 số (VD: hai - mươi - năm)
 * - between_operands: giữa 2 số hạng (chính là tốc độ đọc)
 * - after_operator: sau "cộng" hoặc "trừ", trước số tiếp theo
 */
export type NgheTinhGapType = 'chuan_bi' | 'within_number' | 'between_operands' | 'after_operator' | 'none';

export interface NgheTinhGapConfig {
  /** Khoảng chờ (ms) giữa từng chữ trong 1 số có nhiều chữ số. VD: hai-mươi-năm */
  gapWithinNumberMs: number;
  /** Khoảng chờ (ms) giữa 2 số hạng. Chính là tốc độ đọc. */
  gapBetweenOperandsMs: number;
  /** Khoảng chờ (ms) sau khi đọc "cộng" hoặc "trừ". */
  gapAfterOperatorMs: number;
  /** Khoảng chờ (ms) sau khi đọc "Chuẩn bị". */
  gapAfterChuanBiMs: number;
}

const STORAGE_KEY_NGHE_TINH_GAP = 'ucmas_nghe_tinh_gap_config';

export const DEFAULT_NGHE_TINH_GAP_CONFIG: NgheTinhGapConfig = {
  gapWithinNumberMs: 0,
  gapBetweenOperandsMs: 80,
  gapAfterOperatorMs: 40,
  gapAfterChuanBiMs: 1000,
};

export function getNgheTinhGapConfig(): NgheTinhGapConfig {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_NGHE_TINH_GAP);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NgheTinhGapConfig>;
      return { ...DEFAULT_NGHE_TINH_GAP_CONFIG, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_NGHE_TINH_GAP_CONFIG };
}

export function setNgheTinhGapConfig(cfg: NgheTinhGapConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NGHE_TINH_GAP, JSON.stringify(cfg));
    }
  } catch { /* ignore */ }
}

/** Pause (ms) sau "Chuẩn bị" trước khi đọc phép tính (default, khi chưa dùng config) */
const LISTENING_PAUSE_AFTER_CHUAN_BI_MS = 1000;

/** Base path cho file âm pre-recorded (public folder) */
const NGHE_TINH_AUDIO_PATH = 'audio/nghe-tinh/1.0';

/** Token → text để TTS khi thiếu file. _comma → "," */
function tokenToTtsText(token: string): string {
  if (token === '_comma') return ',';
  if (token === 'Chuẩn_bị') return 'Chuẩn bị';
  return token;
}

/** MP3 magic: ID3 header or frame sync (0xFF 0xFx). HTML/404 starts with < or ! */
function looksLikeMp3(arrayBuffer: ArrayBuffer): boolean {
  if (arrayBuffer.byteLength < 3) return false;
  const v = new Uint8Array(arrayBuffer);
  if (v[0] === 0x49 && v[1] === 0x44 && v[2] === 0x33) return true; // ID3
  if (v[0] === 0xff && (v[1] & 0xe0) === 0xe0) return true; // MPEG frame sync (0xFF 0xFx)
  return false;
}

/** Bucket Supabase Storage cho âm Nghe tính (public). */
const NGHE_TINH_SUPABASE_BUCKET = 'nghe-tinh-audio';

function getTokenAudioUrlAbsolute(token: string): string {
  const fn = TOKEN_TO_FILENAME[token] ?? tokenToFilename(token);
  const fileName = `${fn}.mp3`;

  // Ưu tiên Supabase Storage khi có SUPABASE_URL
  if (SUPABASE_URL && SUPABASE_URL.startsWith('https://')) {
    const base = SUPABASE_URL.replace(/\/$/, '');
    return `${base}/storage/v1/object/public/${NGHE_TINH_SUPABASE_BUCKET}/${fileName}`;
  }

  const base = (typeof import.meta !== 'undefined' && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '';
  const path = (`${base}/${NGHE_TINH_AUDIO_PATH}/${fileName}`).replace(/\/+/g, '/');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

async function fetchTokenAudioOrNull(token: string): Promise<ArrayBuffer | null> {
  try {
    const url = getTokenAudioUrlAbsolute(token);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    if (!looksLikeMp3(arr)) return null; // likely HTML/404 page
    return arr;
  } catch {
    return null;
  }
}

async function decodeAudioBuffer(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> {
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return null;
  }
}

/** Ngưỡng để coi là im lặng (giảm khoảng nghỉ giữa các token khi ghép) */
const SILENCE_THRESHOLD = 0.005;
/** Tối đa (ms) cắt ở cuối mỗi buffer – giảm pause giữa hàng chục và hàng đơn vị */
const MAX_TRIM_TRAILING_MS = 350;
/** Cắt tối thiểu (ms) ở cuối mỗi buffer – đảm bảo khoảng nghỉ luôn ngắn */
const MIN_TRIM_TRAILING_MS = 150;
/** Tối đa (ms) cắt ở đầu mỗi buffer – giảm im lặng đầu file */
const MAX_TRIM_LEADING_MS = 150;

function trimLeadingSilence(buf: AudioBuffer, ctx: AudioContext): AudioBuffer {
  const sampleRate = buf.sampleRate;
  const maxTrimSamples = Math.min(buf.length, Math.floor((MAX_TRIM_LEADING_MS / 1000) * sampleRate));
  if (maxTrimSamples <= 0) return buf;
  const ch0 = buf.getChannelData(0);
  let firstSound = maxTrimSamples;
  for (let i = 0; i < maxTrimSamples; i++) {
    if (Math.abs(ch0[i]) > SILENCE_THRESHOLD) {
      firstSound = i;
      break;
    }
  }
  if (firstSound <= 0) return buf;
  const keepLength = buf.length - firstSound;
  if (keepLength <= 0) return buf;
  const trimmed = ctx.createBuffer(buf.numberOfChannels, keepLength, sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    trimmed.getChannelData(c).set(buf.getChannelData(c).subarray(firstSound, buf.length));
  }
  return trimmed;
}

function trimTrailingSilence(buf: AudioBuffer, ctx: AudioContext): AudioBuffer {
  const sampleRate = buf.sampleRate;
  const maxTrimSamples = Math.min(buf.length, Math.floor((MAX_TRIM_TRAILING_MS / 1000) * sampleRate));
  const minTrimSamples = Math.min(buf.length - 1, Math.floor((MIN_TRIM_TRAILING_MS / 1000) * sampleRate));
  if (maxTrimSamples <= 0) return buf;
  const ch0 = buf.getChannelData(0);
  let keepLength = buf.length;
  for (let i = buf.length - 1; i >= Math.max(0, buf.length - maxTrimSamples); i--) {
    if (Math.abs(ch0[i]) > SILENCE_THRESHOLD) {
      keepLength = i + 1;
      break;
    }
    keepLength = i;
  }
  const finalKeep = Math.min(keepLength, Math.max(1, buf.length - minTrimSamples));
  if (finalKeep >= buf.length) return buf;
  const trimmed = ctx.createBuffer(buf.numberOfChannels, finalKeep, sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    trimmed.getChannelData(c).set(buf.getChannelData(c).subarray(0, finalKeep));
  }
  return trimmed;
}

function createSilenceBuffer(ctx: AudioContext, durationMs: number, sampleRate?: number): AudioBuffer {
  const sr = sampleRate ?? ctx.sampleRate;
  const numSamples = Math.max(0, Math.floor((durationMs / 1000) * sr));
  if (numSamples === 0) return ctx.createBuffer(1, 1, sr);
  const buf = ctx.createBuffer(1, numSamples, sr);
  buf.getChannelData(0).fill(0);
  return buf;
}

/** Ghép các buffer với khoảng im lặng (ms) sau mỗi buffer. gapMs[i] = ms sau buffer i. */
function concatenateBuffersWithGaps(
  ctx: AudioContext,
  buffers: AudioBuffer[],
  gapMs: number[],
): AudioBuffer {
  const sampleRate = buffers[0]?.sampleRate ?? ctx.sampleRate;
  const numChannels = Math.max(1, buffers[0]?.numberOfChannels ?? 1);

  const parts: AudioBuffer[] = [];
  for (let i = 0; i < buffers.length; i++) {
    parts.push(buffers[i]);
    const gap = gapMs[i] ?? 0;
    if (gap > 0) parts.push(createSilenceBuffer(ctx, gap, sampleRate));
  }

  const totalLength = parts.reduce((acc, b) => acc + b.length, 0);
  const result = ctx.createBuffer(numChannels, totalLength, sampleRate);
  const channels = Array.from({ length: numChannels }, (_, c) => result.getChannelData(c));
  let offset = 0;
  for (const buf of parts) {
    const len = buf.length;
    const ch = Math.min(buf.numberOfChannels, numChannels);
    for (let c = 0; c < ch; c++) {
      channels[c].set(buf.getChannelData(c), offset);
    }
    offset += len;
  }
  return result;
}

function getGapMs(gapType: NgheTinhGapType, cfg: NgheTinhGapConfig): number {
  switch (gapType) {
    case 'chuan_bi': return cfg.gapAfterChuanBiMs;
    case 'within_number': return cfg.gapWithinNumberMs;
    case 'between_operands': return cfg.gapBetweenOperandsMs;
    case 'after_operator': return cfg.gapAfterOperatorMs;
    default: return 0;
  }
}

/**
 * Lấy AudioBuffer cho 1 token: fetch từ Storage/local, hoặc TTS nếu thiếu.
 */
async function getTokenAudioBuffer(
  token: string,
  ctx: AudioContext,
  lang: string,
  rate: number,
  opts?: { onMissingTokens?: (tokens: string[]) => void; onAudio?: (a: HTMLAudioElement | null) => void },
): Promise<AudioBuffer | null> {
  const arr = await fetchTokenAudioOrNull(token);
  if (arr) {
    const buf = await decodeAudioBuffer(ctx, arr);
    return buf;
  }

  opts?.onMissingTokens?.([token]);
  if (typeof window === 'undefined' || token.length > 30) return null;

  try {
    const text = tokenToTtsText(token);
    const { base64 } = await synthesizeWithGoogleCloudTextToSpeechMp3(text, 'vi-VN', 1.0, { voiceName: 'vi-VN-Standard-A' });
    const uint8 = base64ToUint8Array(base64);
    const buf = await decodeAudioBuffer(ctx, uint8.buffer);
    if (buf) {
      const fn = TOKEN_TO_FILENAME[token] ?? tokenToFilename(token);
      const { uploadNgheTinhAudio } = await import('./ngheTinhStorageService');
      await uploadNgheTinhAudio(fn, base64).catch(() => {});
      await fetch('/__save-nghe-tinh-audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: fn, base64 }) }).catch(() => {});
      return buf;
    }
  } catch {
    /* fallthrough */
  }
  return null;
}

/**
 * Phát Nghe tính: ghép toàn bộ thành 1 buffer rồi phát một mạch, không ngắt.
 * Âm thiếu → TTS bổ sung. Sau khi nghe xong buffer tự giải phóng (không tạo file).
 */
export async function playConcatenatedListeningVi(
  operands: number[],
  lang: string,
  rate: number,
  opts?: {
    onAudio?: (audio: HTMLAudioElement | null) => void;
    onMissingTokens?: (tokens: string[]) => void;
    gapConfig?: NgheTinhGapConfig;
  }
): Promise<void> {
  if (typeof window === 'undefined' || !window.AudioContext) {
    await playListeningPhraseVi(operands, lang, rate, opts);
    return;
  }

  const gapConfig = opts?.gapConfig ?? getNgheTinhGapConfig();
  const { tokens, gapAfter } = operandsToTokensWithGapTypes(operands, 'addsub');
  if (tokens.length === 0) return;

  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume();

  const buffers: AudioBuffer[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const buf = await getTokenAudioBuffer(tokens[i], ctx, lang, rate, opts);
    if (!buf) {
      await playListeningPhraseVi(operands, lang, rate, opts);
      return;
    }
    let trimmed = buf;
    if (TRIM_DIGIT_TOKENS.has(tokens[i])) {
      trimmed = trimLeadingSilence(trimmed, ctx);
      trimmed = trimTrailingSilence(trimmed, ctx);
    }
    buffers.push(trimmed);
  }

  const gapMs = tokens.map((_, i) => getGapMs(gapAfter[i], gapConfig));
  const full = concatenateBuffersWithGaps(ctx, buffers, gapMs);

  const src = ctx.createBufferSource();
  src.buffer = full;
  src.playbackRate.value = rate;
  src.connect(ctx.destination);
  src.start(0);
  await new Promise<void>((res) => { src.onended = () => res(); });
}

/**
 * Phát câu Nghe tính với pause sau "Chuẩn bị".
 * Dùng thay cho buildListeningPhraseVi + playStableTts trên các trang Nghe tính.
 * Khoảng chờ sau Chuẩn bị lấy từ NgheTinhGapConfig.
 */
export async function playListeningPhraseVi(
  operands: number[],
  lang: string,
  rate: number,
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void }
): Promise<void> {
  const partChuanBi = 'Chuẩn bị.';
  const partCalculation = `${operandsToUcmasListeningPhraseVi(operands)}. Bằng.`;
  const gapCfg = getNgheTinhGapConfig();

  await playStableTts(partChuanBi, lang, rate, opts);
  await new Promise((r) => setTimeout(r, gapCfg.gapAfterChuanBiMs));
  await playStableTts(partCalculation, lang, rate, opts);
}

function getBrowserApiKey(): string | null {
  // Injected by vite.config define from .env.local
  const key =
    (typeof process !== 'undefined' && (process as { env?: Record<string, string> }).env?.VITE_GOOGLE_TTS_API_KEY) ||
    (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_TTS_API_KEY;
  if (typeof key === 'string' && key.trim()) return key.trim();
  try {
    const p = typeof process !== 'undefined' ? (process as { env?: Record<string, string> }).env : null;
    const fallback = p?.GEMINI_API_KEY || p?.API_KEY || null;
    return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : null;
  } catch {
    return null;
  }
}

function getFptAiApiKey(): string | null {
  // Prefer Vite public env var; fallback to process.env if injected similarly.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta: any = typeof import.meta !== 'undefined' ? (import.meta as any) : null;
    const viteKey = meta?.env?.VITE_FPT_AI_API_KEY || meta?.env?.VITE_FPTAI_API_KEY || null;
    if (typeof viteKey === 'string' && viteKey.trim()) return viteKey.trim();
  } catch { /* ignore */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = typeof process !== 'undefined' ? (process as any) : null;
    const key = p?.env?.FPT_AI_API_KEY || p?.env?.FPTAI_API_KEY || null;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
  } catch {
    return null;
  }
}

function buildGoogleTranslateTtsUrl(
  text: string,
  lang: string,
  opts?: { host?: 'translate.google.com' | 'translate.googleapis.com'; client?: string; ttsspeed?: number }
) {
  const tl = baseLang(lang);
  const host = opts?.host ?? 'translate.google.com';
  const client = opts?.client ?? 'tw-ob';
  // ttsspeed: 0.24 (slow) to 1.0 (normal) - Google Translate's internal speed param
  const ttsspeed = opts?.ttsspeed ?? 1.0;
  // Unofficial Google Translate TTS endpoint.
  // NOTE: Some environments block certain hosts/clients; callers should try fallbacks.
  return `https://${host}/translate_tts?ie=UTF-8&client=${encodeURIComponent(client)}&tl=${encodeURIComponent(
    tl
  )}&ttsspeed=${ttsspeed}&q=${encodeURIComponent(text)}`;
}

export function getGoogleTranslateTtsUrl(text: string, lang: string) {
  // Preferred variant (kept for backward compatibility)
  return buildGoogleTranslateTtsUrl(text, lang, { host: 'translate.google.com', client: 'tw-ob' });
}

/** Some regions block one host/client; provide a fallback list. */
export function getGoogleTranslateTtsUrls(text: string, lang: string): string[] {
  // Keep an array API for callers: first URL is the most preferred.
  // We include multiple clients/hosts because some are blocked or intermittently fail.
  return [
    // Preferred: returns an audio stream in most cases
    buildGoogleTranslateTtsUrl(text, lang, { host: 'translate.google.com', client: 'tw-ob' }),
    // Common fallback used by many implementations
    buildGoogleTranslateTtsUrl(text, lang, { host: 'translate.google.com', client: 'gtx' }),
    // Another host that sometimes works when translate.google.com is blocked
    buildGoogleTranslateTtsUrl(text, lang, { host: 'translate.googleapis.com', client: 'gtx' }),
    // Chrome extension client (can work in some regions)
    buildGoogleTranslateTtsUrl(text, lang, { host: 'translate.google.com', client: 'dict-chrome-ex' }),
  ];
}

export function cancelBrowserSpeechSynthesis() {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

type FptAiVoice = 'banmai' | 'lannhi' | 'leminh' | 'myan' | 'thuminh' | 'giahuy' | 'linhsan';

async function synthesizeWithFptAiTtsV5(text: string, opts?: { voice?: FptAiVoice; speed?: number; format?: 'mp3' | 'wav' }) {
  const apiKey = getFptAiApiKey();
  if (!apiKey) throw new Error('Missing FPT.AI api_key');

  // Docs: https://docs.fpt.ai/docs/en/speech/api/text-to-speech.html
  const endpoint = 'https://api.fpt.ai/hmi/tts/v5';
  const voice = opts?.voice ?? 'banmai';
  // speed: -3..+3
  const speed = Math.min(3, Math.max(-3, opts?.speed ?? 0));
  const format = opts?.format ?? 'mp3';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      // FPT docs use "api_key" header name
      'api_key': apiKey,
      'voice': voice,
      'speed': String(speed),
      'format': format,
      'Cache-Control': 'no-cache',
    },
    body: text,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`FPT.AI TTS HTTP ${res.status}: ${msg}`);
  }

  const data = (await res.json()) as { async?: string; error?: number; message?: string; request_id?: string };
  if (data?.error !== 0 || !data?.async) {
    throw new Error(`FPT.AI TTS error: ${data?.error ?? 'unknown'} ${data?.message ?? ''}`);
  }
  return { asyncUrl: data.async, requestId: data.request_id };
}

function mapRateToFptSpeed(rate: number) {
  // Our UI rate ~ 0.5..2.5, FPT speed is -3..+3
  const r = Math.min(Math.max(rate, 0.5), 2.5);
  if (r <= 0.7) return -2;
  if (r <= 0.9) return -1;
  if (r <= 1.15) return 0;
  if (r <= 1.6) return 1;
  if (r <= 2.1) return 2;
  return 3;
}

/**
 * Play Vietnamese TTS via FPT.AI (async mp3) with retries until the audio exists.
 * This is intended for the "Sáng tạo phép tính" test flow first.
 */
export async function playFptAiTts(
  text: string,
  lang: string,
  rate: number,
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void; voice?: FptAiVoice }
): Promise<void> {
  // FPT voice is Vietnamese; ignore non-vi requests for now.
  const _lang = lang || 'vi-VN';
  const onAudio = opts?.onAudio;
  const chunks = splitTtsText(text, 800); // FPT supports long text, but keep chunks moderate
  if (chunks.length === 0) return;

  for (const chunk of chunks) {
    const { asyncUrl } = await synthesizeWithFptAiTtsV5(chunk, {
      voice: opts?.voice ?? 'banmai',
      speed: mapRateToFptSpeed(rate),
      format: 'mp3',
    });

    // The async URL may take a few seconds to exist. We retry playback on error.
    const maxAttempts = 12;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      const audio = new Audio(asyncUrl);
      audio.playbackRate = 1.0;
      onAudio?.(audio);

      const ok = await new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (success: boolean) => {
          if (done) return;
          done = true;
          resolve(success);
        };
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        audio.play().catch(() => finish(false));
      });

      onAudio?.(null);
      if (ok) break;

      // Backoff 0.6s .. ~3s
      const waitMs = Math.min(3000, 600 + attempt * 200);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

function base64ToUint8Array(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function synthesizeWithGoogleCloudTextToSpeechMp3(
  text: string,
  lang: string,
  speakingRate: number,
  opts?: { voiceName?: string; apiKey?: string }
): Promise<{ audioUrl: string; revoke: () => void; base64: string }> {
  const apiKey = opts?.apiKey?.trim() || getBrowserApiKey();
  if (!apiKey) throw new Error('Missing API key');

  const languageCode = lang || 'vi-VN';
  // Google Cloud TTS speakingRate is typically 0.25..4.0
  const safeRate = Math.min(Math.max(speakingRate, 0.25), 4.0);

  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;

  const preferredVoiceName =
    opts?.voiceName?.trim() ||
    (baseLang(languageCode).toLowerCase() === 'vi' ? DEFAULT_VI_CLOUD_VOICE : undefined);

  const bodyBase = {
    input: { text },
    voice: {
      languageCode,
      // Prefer a stable Vietnamese voice when available.
      // If the project doesn't have this voice, we'll retry without a specific name.
      name: preferredVoiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: safeRate,
    },
  } as const;

  const post = async (body: unknown) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`CloudTTS HTTP ${res.status}: ${msg}`);
    }
    // { audioContent: base64 }
    return (await res.json()) as { audioContent?: string };
  };

  let data: { audioContent?: string } | null = null;
  try {
    data = await post(bodyBase);
  } catch {
    // Retry without voice.name (some projects/regions restrict voice selection)
    data = await post({
      input: { text },
      voice: { languageCode },
      audioConfig: { audioEncoding: 'MP3', speakingRate: safeRate },
    });
  }

  const audioContent = data?.audioContent;
  if (!audioContent) throw new Error('CloudTTS missing audioContent');

  const bytes = base64ToUint8Array(audioContent);
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);
  return { audioUrl, revoke: () => URL.revokeObjectURL(audioUrl), base64: audioContent };
}

export async function playGoogleCloudTts(
  text: string,
  lang: string,
  rate: number,
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void; voiceName?: string; apiKey?: string }
): Promise<void> {
  const chunks = splitTtsText(text, 160);
  if (chunks.length === 0) return;

  const onAudio = opts?.onAudio;

  const playAudioElement = (audio: HTMLAudioElement, revoke?: () => void) =>
    new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        try { revoke?.(); } catch { /* ignore */ }
        if (ok) resolve();
        else reject(new Error('Google Cloud TTS playback failed'));
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().then(() => void 0).catch(() => finish(false));
    });

  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    const { audioUrl, revoke } = await synthesizeWithGoogleCloudTextToSpeechMp3(chunk, lang, rate, {
      voiceName: opts?.voiceName,
      apiKey: opts?.apiKey,
    });
    const audio = new Audio(audioUrl);
    // speakingRate is already synthesized in server output.
    audio.playbackRate = 1.0;
    onAudio?.(audio);
    // eslint-disable-next-line no-await-in-loop
    await playAudioElement(audio, revoke);
    onAudio?.(null);
  }
}

/**
 * Google Translate TTS frequently fails when the query is too long (commonly ~200 chars).
 * Split by commas/spaces to keep each chunk under a safe threshold.
 */
export function splitTtsText(text: string, maxChars: number = 160): string[] {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  if (raw.length <= maxChars) return [raw];

  const parts: string[] = [];

  // 1) Prefer splitting by commas (common for reading operands)
  const commaPieces = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const pushSafe = (s: string) => {
    const t = s.trim();
    if (!t) return;
    if (t.length <= maxChars) {
      parts.push(t);
      return;
    }
    // 2) If still too long, split by spaces
    const words = t.split(/\s+/).filter(Boolean);
    let buf = '';
    for (const w of words) {
      const next = buf ? `${buf} ${w}` : w;
      if (next.length > maxChars) {
        if (buf) parts.push(buf);
        // If a single word is longer than maxChars, hard-split it
        if (w.length > maxChars) {
          for (let i = 0; i < w.length; i += maxChars) {
            parts.push(w.slice(i, i + maxChars));
          }
          buf = '';
        } else {
          buf = w;
        }
      } else {
        buf = next;
      }
    }
    if (buf) parts.push(buf);
  };

  // If comma splitting produced only one big piece, just fallback to word splitting.
  if (commaPieces.length <= 1) {
    pushSafe(raw);
    return parts;
  }

  let buf = '';
  for (const piece of commaPieces) {
    // Re-add a comma-like pause between pieces by keeping the delimiter in text.
    const candidate = buf ? `${buf}, ${piece}` : piece;
    if (candidate.length > maxChars) {
      if (buf) pushSafe(buf);
      buf = piece;
    } else {
      buf = candidate;
    }
  }
  if (buf) pushSafe(buf);

  return parts;
}

export async function playBestEffortTts(
  text: string,
  lang: string,
  rate: number,
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void }
): Promise<void> {
  const chunks = splitTtsText(text, 160);
  if (chunks.length === 0) return;

  const onAudio = opts?.onAudio;

  const playAudioElement = (audio: HTMLAudioElement, revoke?: () => void) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { revoke?.(); } catch { /* ignore */ }
        resolve();
      };

      audio.onended = () => finish();
      audio.onerror = () => finish();
      audio.play().then(() => void 0).catch(() => finish());
    });

  for (const chunk of chunks) {
    // 1) Try Google Cloud Text-to-Speech (if API key is present and API is enabled)
    try {
      const { audioUrl, revoke } = await synthesizeWithGoogleCloudTextToSpeechMp3(chunk, lang, rate);
      const audio = new Audio(audioUrl);
      // Cloud TTS already bakes speakingRate, keep playbackRate normal to avoid double-speed.
      audio.playbackRate = 1.0;
      onAudio?.(audio);
      await playAudioElement(audio, revoke);
      onAudio?.(null);
      continue;
    } catch {
      // ignore and fall back
    }

    // 2) Fallback: unofficial Google Translate TTS (MP3 URL)
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const urls = getGoogleTranslateTtsUrls(chunk, lang);
      let currentAudio: HTMLAudioElement | null = null;
      const tryUrl = (i: number) => {
        if (settled) return;
        if (i >= urls.length) {
          // 3) Fallback: browser TTS
          speakWithBrowserTts(chunk, lang, rate).finally(() => {
            if (settled) return;
            finish();
          });
          return;
        }

        // Stop any previous attempt before trying the next URL
        if (currentAudio) {
          try { currentAudio.pause(); } catch { /* ignore */ }
          currentAudio = null;
        }
        const audio = new Audio(urls[i]);
        currentAudio = audio;
        audio.playbackRate = rate;
        onAudio?.(audio);
        audio.onended = () => {
          if (settled) return;
          onAudio?.(null);
          finish();
        };
        audio.onerror = () => {
          if (settled) return;
          tryUrl(i + 1);
        };
        audio.play().catch(() => {
          if (settled) return;
          tryUrl(i + 1);
        });
      };
      tryUrl(0);
    });
  }
}

/**
 * Stable TTS strategy (used for Nghe tính):
 * - Prefers Google Cloud Text-to-Speech (vi-VN-Standard-A) when API key is set
 * - Fallback to Google Translate / browser TTS when key is missing (e.g. production without env)
 */
export async function playStableTts(
  text: string,
  lang: string,
  rate: number,
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void }
): Promise<void> {
  const chunks = splitTtsText(text, 160);
  if (chunks.length === 0) return;

  // When API key is missing (e.g. prod build without VITE_GOOGLE_TTS_API_KEY env),
  // fallback to playBestEffortTts so Nghe tính still works
  if (!getBrowserApiKey()) {
    await playBestEffortTts(text, lang, rate, opts);
    return;
  }

  const onAudio = opts?.onAudio;

  const playAudioElement = (audio: HTMLAudioElement, revoke?: () => void) =>
    new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        try { revoke?.(); } catch { /* ignore */ }
        if (ok) resolve();
        else reject(new Error('Google Cloud TTS playback failed'));
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().then(() => void 0).catch(() => finish(false));
    });

  const cloudLang = baseLang(lang).toLowerCase() === 'vi' ? 'vi-VN' : (lang || 'vi-VN');
  for (const chunk of chunks) {
    const { audioUrl, revoke } = await synthesizeWithGoogleCloudTextToSpeechMp3(chunk, cloudLang, rate, {
      voiceName: baseLang(cloudLang).toLowerCase() === 'vi' ? DEFAULT_VI_CLOUD_VOICE : undefined,
    });
    const audio = new Audio(audioUrl);
    audio.playbackRate = 1.0; // speakingRate is baked into generated audio
    onAudio?.(audio);
    // eslint-disable-next-line no-await-in-loop
    await playAudioElement(audio, revoke);
    onAudio?.(null);
  }
}

/**
 * Play TTS with Cloud-first strategy:
 * 1) Google Cloud TTS (preferred; stable Vietnamese voice)
 * 2) Google Translate unofficial endpoint fallbacks
 * 3) FPT Vietnamese voice (when lang is vi and key exists)
 * 4) Browser SpeechSynthesis
 *
 * IMPORTANT: playbackRate is kept at 1.0 to preserve natural Vietnamese voice.
 * Changing playbackRate causes the voice to sound distorted (like English reading Vietnamese).
 */
export async function playGoogleTranslateTts(
  text: string,
  lang: string,
  _rate: number, // ignored - kept for API compatibility; use ttsspeed in URL instead
  opts?: { onAudio?: (audio: HTMLAudioElement | null) => void }
): Promise<void> {
  const chunks = splitTtsText(text, 160);
  if (chunks.length === 0) return;

  const onAudio = opts?.onAudio;

  const playAudioElement = (audio: HTMLAudioElement) =>
    new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().then(() => void 0).catch(() => finish(false));
    });

  for (const chunk of chunks) {
    let ok = false;

    // 1) Cloud-first (preferred for production stability and voice quality)
    if (!ok) {
      try {
        const { audioUrl, revoke } = await synthesizeWithGoogleCloudTextToSpeechMp3(chunk, lang, 1.0, {
          voiceName: baseLang(lang).toLowerCase() === 'vi' ? DEFAULT_VI_CLOUD_VOICE : undefined,
        });
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.0;
        onAudio?.(audio);
        // eslint-disable-next-line no-await-in-loop
        ok = await playAudioElement(audio);
        onAudio?.(null);
        try { revoke(); } catch { /* ignore */ }
      } catch {
        // ignore and continue
      }
    }

    // 2) Translate endpoint fallbacks (kept for compatibility when Cloud key unavailable)
    if (!ok) {
      const urls = getGoogleTranslateTtsUrls(chunk, lang);
      for (const url of urls) {
        const audio = new Audio(url);
        // CRITICAL: Keep playbackRate = 1.0 to preserve natural Vietnamese pronunciation.
        // Setting playbackRate ≠ 1.0 causes pitch shift → sounds like English reading Vietnamese.
        audio.playbackRate = 1.0;
        onAudio?.(audio);
        // eslint-disable-next-line no-await-in-loop
        ok = await playAudioElement(audio);
        onAudio?.(null);
        if (ok) break;
        try { audio.pause(); } catch { /* ignore */ }
      }
    }

    if (!ok && baseLang(lang) === 'vi') {
      // 3) Vietnamese-specific fallback (if key exists).
      try {
        // eslint-disable-next-line no-await-in-loop
        await playFptAiTts(chunk, 'vi-VN', 1.0, {
          onAudio,
          voice: 'banmai',
        });
        ok = true;
      } catch {
        // ignore and continue
      }
    }

    if (!ok) {
      onAudio?.(null);
      // 4) Last fallback only.
      // eslint-disable-next-line no-await-in-loop
      await speakWithBrowserTts(chunk, lang, 1.0);
    }
  }
}

export function speakWithBrowserTts(text: string, lang: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      // Stop any previous speech to avoid overlaps
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang || 'vi-VN';
      // SpeechSynthesisUtterance.rate is typically 0.1..10 (browser-dependent)
      utter.rate = Math.min(Math.max(rate, 0.5), 2.5);

      const desired = (utter.lang || 'vi-VN').toLowerCase();
      const desiredBase = desired.split('-')[0];

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return null;

        const name = (v: SpeechSynthesisVoice) => (v.name || '').toLowerCase();

        const byLangExact = voices.find(v => (v.lang || '').toLowerCase() === desired) || null;
        if (byLangExact) return byLangExact;

        const byLangBase = voices.find(v => (v.lang || '').toLowerCase().startsWith(desiredBase)) || null;
        if (byLangBase) return byLangBase;

        // Heuristics: sometimes voice.lang is generic or missing but name hints the language.
        if (desiredBase === 'vi') {
          // Prefer common Vietnamese female voices on Windows/Edge/Chrome.
          // Examples: "Microsoft HoaiMy", "HoaiMy", "Mai", etc.
          const femaleHints = [
            'hoaimy', // Microsoft HoaiMy - Vietnamese (Vietnam)
            'hoài', // in case of diacritics in some environments
            'mai',
            'female',
            'woman',
            'nữ',
            'nu ',
          ];
          for (const h of femaleHints) {
            const v = voices.find(vv => name(vv).includes(h));
            if (v) return v;
          }

          return (
            voices.find(v => name(v).includes('vietnam')) ||
            voices.find(v => name(v).includes('việt')) ||
            voices.find(v => name(v).includes('tieng viet')) ||
            null
          );
        }
        if (desiredBase === 'en') {
          return voices.find(v => name(v).includes('english')) || null;
        }
        return (
          null
        );
      };

      utter.onend = () => resolve();
      utter.onerror = () => resolve();

      let started = false;
      const startSpeak = () => {
        if (started) return;
        started = true;
        window.speechSynthesis.speak(utter);
      };

      const trySetVoice = () => {
        try {
          const v = pickVoice();
          if (v) utter.voice = v;
          return !!v;
        } catch {
          return false;
        }
      };

      // Attempt immediate match (best case)
      const hasVoice = trySetVoice();
      if (hasVoice) {
        startSpeak();
        return;
      }

      // Some browsers populate voices async (or update later). Wait briefly to improve match rate.
      const onVoices = () => {
        trySetVoice();
        cleanup();
        startSpeak();
      };
      const cleanup = () => {
        try {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        } catch { /* ignore */ }
        if (timeoutId) window.clearTimeout(timeoutId);
      };

      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      // Safety timeout: speak anyway after a short delay (gives time for Vietnamese voice to appear)
      const timeoutId = window.setTimeout(() => {
        trySetVoice();
        cleanup();
        startSpeak();
      }, 1200);
    } catch {
      resolve();
    }
  });
}

