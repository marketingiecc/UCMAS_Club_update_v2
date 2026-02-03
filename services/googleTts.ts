function baseLang(lang: string) {
  return (lang || 'vi').split('-')[0]; // vi-VN -> vi
}

/** Digits 0-9 in Vietnamese (for reading numbers). */
const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;

/**
 * Convert a number to Vietnamese words for TTS (so "12" is read as "mười hai" not "twelve").
 * Handles integers and decimals (e.g. 3.5 -> "ba phẩy năm").
 */
export function numberToVietnameseWords(n: number): string {
  if (!Number.isFinite(n)) return 'không';
  if (n < 0) return 'âm ' + numberToVietnameseWords(-n);

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
  // Fallback for very large numbers: spell digits
  return String(x).split('').map(d => VI_DIGITS[parseInt(d, 10)]).join(' ');
}

/**
 * Build the Vietnamese listening phrase for Nghe tính: "Chuẩn bị. [numbers in words]. Bằng."
 * Use this so TTS reads numbers in Vietnamese instead of English.
 */
export function buildListeningPhraseVi(operands: number[]): string {
  const parts = operands.map(numberToVietnameseWords);
  return `Chuẩn bị. ${parts.join(', ')}. Bằng.`;
}

function getBrowserApiKey(): string | null {
  // This project already injects GEMINI_API_KEY into process.env via Vite config.
  // We reuse it (optionally) for Google Cloud Text-to-Speech if that API is enabled.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = typeof process !== 'undefined' ? (process as any) : null;
    const key = p?.env?.GEMINI_API_KEY || p?.env?.API_KEY || null;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
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
  speakingRate: number
): Promise<{ audioUrl: string; revoke: () => void }> {
  const apiKey = getBrowserApiKey();
  if (!apiKey) throw new Error('Missing API key');

  const languageCode = lang || 'vi-VN';
  // Google Cloud TTS speakingRate is typically 0.25..4.0
  const safeRate = Math.min(Math.max(speakingRate, 0.25), 4.0);

  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;

  const bodyBase = {
    input: { text },
    voice: {
      languageCode,
      // Prefer a stable Vietnamese voice when available.
      // If the project doesn't have this voice, we'll retry without a specific name.
      name: languageCode === 'vi-VN' ? 'vi-VN-Standard-A' : undefined,
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
  return { audioUrl, revoke: () => URL.revokeObjectURL(audioUrl) };
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
 * - Prefer Google Cloud Text-to-Speech when API key exists and API is enabled
 * - Fallback to browser SpeechSynthesis
 *
 * Intentionally does NOT use Google Translate TTS URL retries to avoid the
 * "re-reading many times after ended" issues on some browsers/environments.
 */
export async function playStableTts(
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
    // 1) Cloud TTS (best Vietnamese quality)
    try {
      const { audioUrl, revoke } = await synthesizeWithGoogleCloudTextToSpeechMp3(chunk, lang, rate);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.0; // already baked into speakingRate
      onAudio?.(audio);
      await playAudioElement(audio, revoke);
      onAudio?.(null);
      continue;
    } catch {
      // ignore and fall back
    }

    // 2) Browser TTS fallback
    onAudio?.(null);
    await speakWithBrowserTts(chunk, lang, rate);
  }
}

/**
 * Play TTS using unofficial Google Translate TTS endpoint first.
 * Falls back to browser SpeechSynthesis when audio playback is blocked/failed.
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
    const urls = getGoogleTranslateTtsUrls(chunk, lang);
    let ok = false;
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

    if (!ok) {
      onAudio?.(null);
      // Browser TTS fallback (prefers Vietnamese female voices when possible)
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

