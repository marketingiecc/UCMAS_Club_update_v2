export function getGoogleTranslateTtsUrl(text: string, lang: string) {
  const tl = (lang || 'vi').split('-')[0]; // vi-VN -> vi
  // Using translate.googleapis.com tends to be more reliable for TTS requests.
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(
    tl
  )}&q=${encodeURIComponent(text)}`;
}

export function cancelBrowserSpeechSynthesis() {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
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

      utter.onend = () => resolve();
      utter.onerror = () => resolve();

      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

