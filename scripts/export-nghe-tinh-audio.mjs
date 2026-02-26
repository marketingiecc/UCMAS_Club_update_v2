#!/usr/bin/env node
/**
 * Export pre-recorded audio for Nghe tinh (concatenative TTS).
 * Requires: VITE_GOOGLE_TTS_API_KEY or .env.local with the key.
 * Output: public/audio/nghe-tinh/1.0/*.mp3
 *
 * Run: node scripts/export-nghe-tinh-audio.mjs
 * Or with env: node --env-file=.env.local scripts/export-nghe-tinh-audio.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'nghe-tinh', '1.0');

/** [filename, TTS text (Vietnamese)] */
const EXPORT_LIST = [
  ['khong', 'không'],
  ['mot', 'một'],
  ['hai', 'hai'],
  ['ba', 'ba'],
  ['bon', 'bốn'],
  ['nam', 'năm'],
  ['sau', 'sáu'],
  ['bay', 'bảy'],
  ['tam', 'tám'],
  ['chin', 'chín'],
  ['muoi', 'mười'],
  ['muoi2', 'mươi'],
  ['mot2', 'mốt'],
  ['lam', 'lăm'],
  ['linh', 'linh'],
  ['tram', 'trăm'],
  ['nghin', 'nghìn'],
  ['trieu', 'triệu'],
  ['ty', 'tỷ'],
  ['cong', 'cộng'],
  ['tru', 'trừ'],
  ['nhan', 'nhân'],
  ['chia', 'chia'],
  ['phay', 'phẩy'],
  ['chuan_bi', 'Chuẩn bị'],
  ['bang', 'Bằng'],
  ['_comma', ','],  // 80ms pause - TTS comma may produce short silence
];

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function synthesizeWithGoogleTts(text, apiKey, lang = 'vi-VN') {
  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
  const body = {
    input: { text },
    voice: { languageCode: lang, name: 'vi-VN-Standard-A' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`TTS HTTP ${res.status}: ${msg}`);
  }
  const data = await res.json();
  if (!data.audioContent) throw new Error('Missing audioContent');
  return Buffer.from(data.audioContent, 'base64');
}

async function main() {
  loadEnv();
  const apiKey = process.env.VITE_GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.error('Missing VITE_GOOGLE_TTS_API_KEY. Set in .env.local or env.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Exporting to ${OUT_DIR}\n`);

  for (const [filename, text] of EXPORT_LIST) {
    try {
      const buf = await synthesizeWithGoogleTts(text, apiKey);
      const outPath = path.join(OUT_DIR, `${filename}.mp3`);
      fs.writeFileSync(outPath, buf);
      console.log(`OK: ${filename}.mp3 (${text})`);
    } catch (e) {
      console.error(`FAIL: ${filename}.mp3 - ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('\nDone. If _comma sounds odd, create 80ms silence manually: sox -n -r 22050 -c 1 _comma.mp3 trim 0 0.08');
}

main();
