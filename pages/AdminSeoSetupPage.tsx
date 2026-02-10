import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SiteSeoSettings,
  loadSiteSeoSettings,
  saveSiteSeoSettings,
  sanitizeSvgText,
  svgTextToDataUrl,
  emitSiteSeoUpdated,
} from '../services/siteSeoService';

type SvgDraft = {
  raw: string;
  dataUrl: string;
  fileName?: string;
};

const singletonId = 'default';

/* ── Character‑count helper ──────────────────────────────────────── */
const CharCount: React.FC<{ value: string; ideal: [number, number] }> = ({ value, ideal }) => {
  const len = (value || '').length;
  const [min, max] = ideal;
  const color = len === 0 ? 'text-gray-400' : len < min ? 'text-amber-600' : len > max ? 'text-red-500' : 'text-green-600';
  return (
    <span className={`text-[10px] font-heading font-bold ${color} ml-2`}>
      {len}/{max} {len > 0 && len >= min && len <= max && '✓'}
    </span>
  );
};

/* ── DEFAULT JSON‑LD ─────────────────────────────────────────────── */
const DEFAULT_JSONLD = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UCMAS Club',
    url: 'https://ucmas.club',
    logo: '',
    description: '',
    sameAs: [],
  },
  null,
  2,
);

const AdminSeoSetupPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<SiteSeoSettings>({
    id: singletonId,
    site_name: 'UCMAS Club',
    default_title: 'UCMAS Club - Luyện Tập Toán Tư Duy',
    default_description: '',
    keywords: '',
    canonical_url: '',
    robots: 'index,follow',
    og_title: '',
    og_description: '',
    og_url: '',
    og_image_svg: null,
    twitter_site: '',
    twitter_creator: '',
    theme_color: '#2E3191',
    google_site_verification: '',
    structured_data_json: DEFAULT_JSONLD,
    footer_company_name: 'UCMAS VIỆT NAM',
    logo_svg: null,
    favicon_svg: null,
  });

  const [logoDraft, setLogoDraft] = useState<SvgDraft | null>(null);
  const [faviconDraft, setFaviconDraft] = useState<SvgDraft | null>(null);
  const [ogDraft, setOgDraft] = useState<SvgDraft | null>(null);
  const [jsonLdError, setJsonLdError] = useState<string | null>(null);

  /* ── Load ────────────────────────────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg(null);
      setWarning(null);
      try {
        const res = await loadSiteSeoSettings();
        if (res.warning) setWarning(res.warning);
        if (res.settings) {
          const s = res.settings;
          setForm((prev) => ({
            ...prev,
            ...s,
            id: s.id || singletonId,
            // Ensure non‑null strings for inputs
            site_name: s.site_name ?? prev.site_name,
            default_title: s.default_title ?? prev.default_title,
            default_description: s.default_description ?? '',
            keywords: s.keywords ?? '',
            canonical_url: s.canonical_url ?? '',
            robots: s.robots ?? 'index,follow',
            og_title: s.og_title ?? '',
            og_description: s.og_description ?? '',
            og_url: s.og_url ?? '',
            twitter_site: s.twitter_site ?? '',
            twitter_creator: s.twitter_creator ?? '',
            theme_color: s.theme_color ?? '#2E3191',
            google_site_verification: s.google_site_verification ?? '',
            structured_data_json: s.structured_data_json ?? DEFAULT_JSONLD,
            footer_company_name: s.footer_company_name ?? 'UCMAS VIỆT NAM',
          }));

          if ((s.logo_svg || '').trim()) setLogoDraft({ raw: String(s.logo_svg), dataUrl: svgTextToDataUrl(String(s.logo_svg)) });
          if ((s.favicon_svg || '').trim()) setFaviconDraft({ raw: String(s.favicon_svg), dataUrl: svgTextToDataUrl(String(s.favicon_svg)) });
          if ((s.og_image_svg || '').trim()) setOgDraft({ raw: String(s.og_image_svg), dataUrl: svgTextToDataUrl(String(s.og_image_svg)) });
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  /* Warn on navigation with unsaved changes */
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  /* ── SVG file reader ────────────────────────────────────────── */
  const readSvgFile = (file: File): Promise<{ ok: true; svg: string } | { ok: false; reason: string }> => {
    return new Promise((resolve) => {
      if (!file) return resolve({ ok: false, reason: 'Không có file.' });
      const isSvgMime = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      if (!isSvgMime) return resolve({ ok: false, reason: 'Vui lòng chọn file SVG (.svg).' });

      const reader = new FileReader();
      reader.onerror = () => resolve({ ok: false, reason: 'Không đọc được file.' });
      reader.onload = () => {
        const text = String(reader.result || '');
        const sanitized = sanitizeSvgText(text);
        if (!sanitized.ok) return resolve({ ok: false, reason: sanitized.reason });
        resolve({ ok: true, svg: sanitized.svg });
      };
      reader.readAsText(file);
    });
  };

  const logoPreview = useMemo(() => logoDraft?.dataUrl || null, [logoDraft]);
  const faviconPreview = useMemo(() => faviconDraft?.dataUrl || null, [faviconDraft]);
  const ogPreview = useMemo(() => ogDraft?.dataUrl || null, [ogDraft]);

  const updateForm = (partial: Partial<SiteSeoSettings>) => {
    setForm((p) => ({ ...p, ...partial }));
    setDirty(true);
  };

  const onPickLogo = async (file: File | null) => {
    setMsg(null);
    if (!file) return;
    const res = await readSvgFile(file);
    if (!res.ok) return setMsg(`❌ ${res.reason}`);
    setLogoDraft({ raw: res.svg, dataUrl: svgTextToDataUrl(res.svg), fileName: file.name });
    updateForm({ logo_svg: res.svg });
  };

  const onPickFavicon = async (file: File | null) => {
    setMsg(null);
    if (!file) return;
    const res = await readSvgFile(file);
    if (!res.ok) return setMsg(`❌ ${res.reason}`);
    setFaviconDraft({ raw: res.svg, dataUrl: svgTextToDataUrl(res.svg), fileName: file.name });
    updateForm({ favicon_svg: res.svg });
  };

  const onPickOg = async (file: File | null) => {
    setMsg(null);
    if (!file) return;
    const res = await readSvgFile(file);
    if (!res.ok) return setMsg(`❌ ${res.reason}`);
    setOgDraft({ raw: res.svg, dataUrl: svgTextToDataUrl(res.svg), fileName: file.name });
    updateForm({ og_image_svg: res.svg });
  };

  /* ── JSON-LD validator ──────────────────────────────────────── */
  const validateJsonLd = (text: string) => {
    const raw = (text || '').trim();
    if (!raw) { setJsonLdError(null); return; }
    try {
      JSON.parse(raw);
      setJsonLdError(null);
    } catch (e: any) {
      setJsonLdError(e?.message || 'JSON không hợp lệ');
    }
  };

  /* ── Save ────────────────────────────────────────────────────── */
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonLdError) { setMsg('❌ JSON-LD không hợp lệ. Hãy sửa trước khi lưu.'); return; }

    setSaving(true);
    setMsg(null);
    try {
      const payload: SiteSeoSettings = { ...form, id: singletonId };
      const res = await saveSiteSeoSettings(payload);
      if (!res.success) {
        setMsg(`❌ ${res.message || 'Lưu thất bại.'}`);
        return;
      }
      if (res.warning) setWarning(res.warning);
      setMsg('✅ Đã lưu cấu hình SEO thành công.');
      setDirty(false);
      emitSiteSeoUpdated();
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived values for preview ─────────────────────────────── */
  const serpTitle = (form.default_title || 'UCMAS Club').trim();
  const serpDesc = (form.default_description || 'Chưa có mô tả').trim();
  const serpUrl = (form.canonical_url || 'https://ucmas.club').trim();

  const ogT = (form.og_title || serpTitle).trim();
  const ogD = (form.og_description || serpDesc).trim();
  const ogSiteName = (form.site_name || '').trim();

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-black text-gray-800 uppercase tracking-tight">Setup SEO</h1>
            <p className="text-sm text-gray-500 mt-1">
              Thiết lập thông tin SEO, meta tags, structured data và upload SVG.
              {dirty && <span className="text-amber-600 font-bold ml-2">• Chưa lưu</span>}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-bold self-start"
          >
            ← Về Admin
          </button>
        </div>

        {/* Warnings / Messages */}
        {(warning || msg) && (
          <div className="mb-5 space-y-2">
            {warning && <div className="text-sm p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800">⚠️ {warning}</div>}
            {msg && <div className="text-sm p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800">{msg}</div>}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-6">
          {/* ═══════ Section: Basic Info ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-4">Thông tin trang</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên website</label>
                <input
                  value={form.site_name || ''}
                  onChange={(e) => updateForm({ site_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="UCMAS Club"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Canonical URL</label>
                <input
                  value={form.canonical_url || ''}
                  onChange={(e) => updateForm({ canonical_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="https://ucmas.club"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center text-xs font-heading font-bold text-gray-600 mb-1">
                  Tiêu đề (title) <CharCount value={form.default_title || ''} ideal={[50, 60]} />
                </label>
                <input
                  value={form.default_title || ''}
                  onChange={(e) => updateForm({ default_title: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="UCMAS Club - Luyện Tập Toán Tư Duy"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center text-xs font-heading font-bold text-gray-600 mb-1">
                  Mô tả (description) <CharCount value={form.default_description || ''} ideal={[120, 160]} />
                </label>
                <textarea
                  value={form.default_description || ''}
                  onChange={(e) => updateForm({ default_description: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 min-h-[90px] focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="Mô tả ngắn về website..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Từ khóa (keywords)</label>
                <input
                  value={form.keywords || ''}
                  onChange={(e) => updateForm({ keywords: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="ucmas, mental math, toán tư duy, nhìn tính, nghe tính, flash"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Robots</label>
                <input
                  value={form.robots || ''}
                  onChange={(e) => updateForm({ robots: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="index,follow"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.theme_color || '#2E3191'}
                    onChange={(e) => updateForm({ theme_color: e.target.value })}
                    className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1"
                  />
                  <input
                    value={form.theme_color || ''}
                    onChange={(e) => updateForm({ theme_color: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                    placeholder="#2E3191"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Google Site Verification</label>
                <input
                  value={form.google_site_verification || ''}
                  onChange={(e) => updateForm({ google_site_verification: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="Mã xác minh Google Search Console"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Tên công ty (hiện ở footer)</label>
                <input
                  value={form.footer_company_name || ''}
                  onChange={(e) => updateForm({ footer_company_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="UCMAS VIỆT NAM"
                />
              </div>
            </div>
          </div>

          {/* ═══════ SERP Preview ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-4">Google Search Preview</div>
            <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-sm text-green-700 font-mono truncate mb-1">{serpUrl}</div>
              <div className="text-lg text-blue-800 font-medium leading-snug hover:underline cursor-default truncate">{serpTitle || 'Tiêu đề trang'}</div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{serpDesc || 'Mô tả trang sẽ hiện ở đây...'}</div>
            </div>
          </div>

          {/* ═══════ Section: Social / OG ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-4">Open Graph / Twitter</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-heading font-bold text-gray-600 mb-1">
                  OG Title <CharCount value={form.og_title || ''} ideal={[40, 60]} />
                </label>
                <input
                  value={form.og_title || ''}
                  onChange={(e) => updateForm({ og_title: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="Nếu để trống sẽ dùng Title mặc định"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">OG URL</label>
                <input
                  value={form.og_url || ''}
                  onChange={(e) => updateForm({ og_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="Nếu để trống sẽ dùng Canonical URL"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center text-xs font-heading font-bold text-gray-600 mb-1">
                  OG Description <CharCount value={form.og_description || ''} ideal={[55, 200]} />
                </label>
                <textarea
                  value={form.og_description || ''}
                  onChange={(e) => updateForm({ og_description: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 min-h-[80px] focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="Nếu để trống sẽ dùng Description mặc định"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Twitter @site</label>
                <input
                  value={form.twitter_site || ''}
                  onChange={(e) => updateForm({ twitter_site: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="@ucmasclub"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-gray-600 mb-1">Twitter @creator</label>
                <input
                  value={form.twitter_creator || ''}
                  onChange={(e) => updateForm({ twitter_creator: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-ucmas-blue/30 focus:border-ucmas-blue transition"
                  placeholder="@creator"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-heading font-bold text-gray-600 mb-2">OG Image (SVG upload)</label>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="w-full md:w-1/2 space-y-2">
                    <input
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={(e) => void onPickOg(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                    />
                    {ogDraft && (
                      <button type="button" onClick={() => { setOgDraft(null); updateForm({ og_image_svg: null }); }} className="text-xs text-red-500 hover:underline">Xóa OG Image</button>
                    )}
                    <div className="text-[11px] text-gray-400">Khuyến nghị: SVG đơn giản, kích thước ~1200x630.</div>
                  </div>
                  <div className="w-full md:w-1/2 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-2">Preview</div>
                    {ogPreview ? (
                      <img src={ogPreview} alt="" className="w-full h-40 object-contain bg-white rounded-xl border border-gray-100" />
                    ) : (
                      <div className="text-sm text-gray-400 italic">Chưa có OG Image</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ Social Card Preview ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-4">Social Card Preview (Facebook / Twitter)</div>
            <div className="max-w-md">
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                {/* Image area */}
                <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {ogPreview ? (
                    <img src={ogPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 text-sm italic">Chưa có hình ảnh</div>
                  )}
                </div>
                {/* Text area */}
                <div className="p-4 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase font-medium truncate">{(form.og_url || form.canonical_url || 'ucmas.club').replace(/^https?:\/\//, '')}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">{ogT || 'Tiêu đề'}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ogD || 'Mô tả...'}</div>
                  {ogSiteName && <div className="text-[11px] text-gray-400 mt-2 truncate">{ogSiteName}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ Section: Upload SVG ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-4">Upload SVG (Logo & Favicon)</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Logo */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-heading font-black text-gray-800">Logo (SVG)</div>
                    <div className="text-[11px] text-gray-500 mt-1">Hiện trên thanh điều hướng.</div>
                  </div>
                  {logoDraft && (
                    <button type="button" onClick={() => { setLogoDraft(null); updateForm({ logo_svg: null }); }}
                      className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-red-500 text-xs font-heading font-black uppercase"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => void onPickLogo(e.target.files?.[0] || null)}
                  className="w-full mt-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                />
                <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
                  <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-2">Preview</div>
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-20 w-auto object-contain" />
                  ) : (
                    <div className="text-sm text-gray-400 italic">Chưa có (sử dụng logo mặc định)</div>
                  )}
                </div>
              </div>

              {/* Favicon */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-heading font-black text-gray-800">Favicon (SVG)</div>
                    <div className="text-[11px] text-gray-500 mt-1">Icon trên tab trình duyệt.</div>
                  </div>
                  {faviconDraft && (
                    <button type="button" onClick={() => { setFaviconDraft(null); updateForm({ favicon_svg: null }); }}
                      className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-red-500 text-xs font-heading font-black uppercase"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => void onPickFavicon(e.target.files?.[0] || null)}
                  className="w-full mt-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white"
                />
                <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
                  <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400 mb-2">Preview</div>
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="text-sm text-gray-400 italic">Chưa có (sử dụng favicon mặc định)</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ Section: JSON-LD Structured Data ═══════ */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-400">Structured Data (JSON-LD)</div>
              <button
                type="button"
                onClick={() => { updateForm({ structured_data_json: DEFAULT_JSONLD }); setJsonLdError(null); }}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-heading font-black uppercase"
              >
                Tải mẫu mặc định
              </button>
            </div>
            <div className="text-[11px] text-gray-500 mb-3">
              JSON-LD giúp Google hiểu rõ hơn về trang web (Organization, WebSite, ...).
              Xem thêm tại{' '}
              <a href="https://schema.org/Organization" target="_blank" rel="noreferrer" className="text-ucmas-blue underline">schema.org</a>.
            </div>
            <textarea
              value={form.structured_data_json || ''}
              onChange={(e) => {
                updateForm({ structured_data_json: e.target.value });
                validateJsonLd(e.target.value);
              }}
              className={`w-full px-4 py-3 rounded-2xl border font-mono text-sm min-h-[200px] focus:ring-2 transition ${
                jsonLdError ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-gray-200 focus:ring-ucmas-blue/30 focus:border-ucmas-blue'
              }`}
              placeholder='{"@context":"https://schema.org","@type":"Organization",...}'
              spellCheck={false}
            />
            {jsonLdError && (
              <div className="mt-2 text-xs text-red-600 font-medium">
                JSON không hợp lệ: {jsonLdError}
              </div>
            )}
            {!jsonLdError && (form.structured_data_json || '').trim() && (
              <div className="mt-2 text-xs text-green-600 font-medium">JSON hợp lệ ✓</div>
            )}
          </div>

          {/* ═══════ Action buttons ═══════ */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-gray-400">
              {form.updated_at && `Cập nhật lần cuối: ${new Date(form.updated_at).toLocaleString('vi-VN')}`}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-heading font-black uppercase text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-6 py-3 rounded-2xl bg-ucmas-red text-white font-heading font-black uppercase text-xs tracking-wide hover:bg-ucmas-blue transition disabled:opacity-60 shadow-md"
              >
                {saving ? 'Đang lưu...' : 'Lưu cấu hình SEO'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-ucmas-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <div className="text-sm text-gray-500">Đang tải cấu hình SEO...</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminSeoSetupPage;
