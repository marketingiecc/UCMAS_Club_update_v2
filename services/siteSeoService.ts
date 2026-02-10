import { backend } from './mockBackend';

export type SiteSeoSettings = {
  id: string; // singleton key, e.g. "default"

  site_name?: string | null;
  default_title?: string | null;
  default_description?: string | null;
  keywords?: string | null;
  canonical_url?: string | null;
  robots?: string | null;

  og_title?: string | null;
  og_description?: string | null;
  og_url?: string | null;
  og_image_svg?: string | null; // raw SVG text

  twitter_site?: string | null;
  twitter_creator?: string | null;

  theme_color?: string | null;            // <meta name="theme-color"> e.g. "#2E3191"
  google_site_verification?: string | null; // <meta name="google-site-verification">
  structured_data_json?: string | null;    // JSON-LD text (Organization schema, etc.)
  footer_company_name?: string | null;     // Footer branding text

  logo_svg?: string | null; // raw SVG text
  favicon_svg?: string | null; // raw SVG text

  updated_at?: string | null;
};

const STORAGE_KEY = 'ucmas_site_seo_settings_v1';
const EVENT_NAME = 'ucmas-site-seo-updated';

const isMissingTableError = (msg: string) => {
  const m = (msg || '').toLowerCase();
  return m.includes('does not exist') || m.includes('could not find the table') || m.includes('relation') && m.includes('does not exist');
};

export function svgTextToDataUrl(svgText: string): string {
  // Use encodeURIComponent to preserve UTF-8 characters.
  const trimmed = (svgText || '').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
}

export function sanitizeSvgText(svgText: string): { ok: true; svg: string } | { ok: false; reason: string } {
  const raw = (svgText || '').trim();
  if (!raw) return { ok: false, reason: 'SVG rỗng.' };
  if (raw.length > 400_000) return { ok: false, reason: 'SVG quá lớn (tối đa 400KB).' };

  const low = raw.toLowerCase();
  if (!low.includes('<svg')) return { ok: false, reason: 'File không phải SVG hợp lệ (thiếu thẻ <svg>).' };

  // Very defensive: reject obvious XSS vectors.
  const forbidden = [
    '<script',
    '</script',
    'javascript:',
    'data:text/html',
    '<iframe',
    '</iframe',
    '<object',
    '</object',
    '<embed',
    '</embed',
    '<foreignobject',
    '</foreignobject',
  ];
  for (const s of forbidden) {
    if (low.includes(s)) return { ok: false, reason: `SVG chứa nội dung không cho phép: ${s}` };
  }

  // Remove on* event handlers (best-effort).
  const cleaned = raw.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  return { ok: true, svg: cleaned };
}

function upsertLink(rel: string, attrs: Record<string, string>) {
  const head = document.head;
  if (!head) return;
  const selector = `link[rel="${rel}"]`;
  let el = head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const head = document.head;
  if (!head) return;
  const selector = `meta[${attr}="${key}"]`;
  let el = head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applySiteSeoToDocument(settings: SiteSeoSettings | null) {
  const s = settings;
  if (!s) return;

  const title = (s.default_title || '').trim();
  if (title) document.title = title;

  const desc = (s.default_description || '').trim();
  if (desc) upsertMeta('name', 'description', desc);

  const keywords = (s.keywords || '').trim();
  if (keywords) upsertMeta('name', 'keywords', keywords);

  const robots = (s.robots || '').trim();
  if (robots) upsertMeta('name', 'robots', robots);

  const canonical = (s.canonical_url || '').trim();
  if (canonical) upsertLink('canonical', { href: canonical });

  // Theme color
  const themeColor = (s.theme_color || '').trim();
  if (themeColor) upsertMeta('name', 'theme-color', themeColor);

  // Google Search Console verification
  const gVerify = (s.google_site_verification || '').trim();
  if (gVerify) upsertMeta('name', 'google-site-verification', gVerify);

  // Open Graph
  upsertMeta('property', 'og:type', 'website');
  if ((s.site_name || '').trim()) upsertMeta('property', 'og:site_name', String(s.site_name));
  if ((s.og_title || title).trim()) upsertMeta('property', 'og:title', String((s.og_title || title).trim()));
  if ((s.og_description || desc).trim()) upsertMeta('property', 'og:description', String((s.og_description || desc).trim()));

  const ogUrlVal = (s.og_url || s.canonical_url || '').trim();
  if (ogUrlVal) upsertMeta('property', 'og:url', ogUrlVal);

  if ((s.og_image_svg || '').trim()) {
    const ogImgUrl = svgTextToDataUrl(String(s.og_image_svg));
    upsertMeta('property', 'og:image', ogImgUrl);
  }

  // Twitter
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  if ((s.twitter_site || '').trim()) upsertMeta('name', 'twitter:site', String(s.twitter_site).trim());
  if ((s.twitter_creator || '').trim()) upsertMeta('name', 'twitter:creator', String(s.twitter_creator).trim());
  if ((s.og_title || title).trim()) upsertMeta('name', 'twitter:title', String((s.og_title || title).trim()));
  if ((s.og_description || desc).trim()) upsertMeta('name', 'twitter:description', String((s.og_description || desc).trim()));
  if ((s.og_image_svg || '').trim()) {
    const ogImgUrl = svgTextToDataUrl(String(s.og_image_svg));
    upsertMeta('name', 'twitter:image', ogImgUrl);
  }

  // Favicon (SVG)
  if ((s.favicon_svg || '').trim()) {
    const href = svgTextToDataUrl(String(s.favicon_svg));
    upsertLink('icon', { href, type: 'image/svg+xml' });
  }

  // JSON-LD Structured Data
  injectJsonLd(s.structured_data_json);
}

const JSONLD_SCRIPT_ID = 'ucmas-seo-jsonld';

function injectJsonLd(jsonText?: string | null) {
  const head = document.head;
  if (!head) return;

  // Remove existing
  const existing = document.getElementById(JSONLD_SCRIPT_ID);
  if (existing) existing.remove();

  const raw = (jsonText || '').trim();
  if (!raw) return;

  try {
    // Validate it's actual JSON
    JSON.parse(raw);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSONLD_SCRIPT_ID;
    script.textContent = raw;
    head.appendChild(script);
  } catch {
    // Invalid JSON — silently skip
  }
}

export function emitSiteSeoUpdated() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function onSiteSeoUpdated(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT_NAME, handler as any);
  return () => window.removeEventListener(EVENT_NAME, handler as any);
}

export async function loadSiteSeoSettings(): Promise<{ settings: SiteSeoSettings | null; warning?: string }> {
  // 1) Try DB
  try {
    const res = await (backend as any).getSiteSeoSettings?.();
    if (res?.settings) return { settings: res.settings as SiteSeoSettings, warning: res.warning };
  } catch (e: any) {
    // fall through to localStorage
    const msg = e?.message || String(e || '');
    if (!isMissingTableError(msg)) {
      // Non-table errors still fall back, but keep as warning.
      // eslint-disable-next-line no-console
      console.warn('loadSiteSeoSettings db error:', msg);
    }
  }

  // 2) localStorage fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { settings: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { settings: null };
    return { settings: parsed as SiteSeoSettings, warning: 'Đang dùng cấu hình SEO tạm (localStorage) vì DB chưa sẵn sàng.' };
  } catch {
    return { settings: null };
  }
}

export async function saveSiteSeoSettings(next: SiteSeoSettings): Promise<{ success: boolean; warning?: string; message?: string }> {
  // 1) Try DB
  try {
    const res = await (backend as any).adminUpsertSiteSeoSettings?.(next);
    if (res?.success) return { success: true, warning: res.warning };
    if (res && res.success === false) {
      const msg = String(res.message || '');
      const looksLikeMissingTable =
        msg.toLowerCase().includes('site_seo_settings') ||
        msg.toLowerCase().includes('chưa tồn tại') ||
        msg.toLowerCase().includes('could not find the table') ||
        msg.toLowerCase().includes('does not exist');
      if (!looksLikeMissingTable) return { success: false, message: res.message || 'Lưu thất bại.' };
      // Fall through to localStorage fallback if DB table isn't ready.
    }
  } catch (e: any) {
    const msg = e?.message || String(e || '');
    if (!isMissingTableError(msg)) {
      // eslint-disable-next-line no-console
      console.warn('saveSiteSeoSettings db error:', msg);
    }
  }

  // 2) localStorage fallback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { success: true, warning: 'Đã lưu vào localStorage (tạm). Hãy chạy SQL để lưu vào Supabase DB.' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Không lưu được.' };
  }
}

