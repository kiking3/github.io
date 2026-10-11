(function (root) {
  'use strict';
  const supported = ['en', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'id', 'ur'];
  const countryGroups = {
    en: ['US', 'GB', 'AU', 'NZ', 'IE', 'CA', 'NG', 'GH', 'KE', 'UG', 'ZA'],
    hi: ['IN'], bn: ['BD'], ur: ['PK'], id: ['ID'],
    pt: ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'],
    es: ['ES', 'MX', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE', 'GQ'],
    fr: ['FR', 'MC', 'BE', 'LU', 'BF', 'BI', 'BJ', 'CD', 'CG', 'CI', 'GA', 'GN', 'ML', 'NE', 'SN', 'TG', 'TD', 'CF', 'KM', 'MG', 'DJ', 'NC', 'PF'],
    ar: ['SA', 'AE', 'BH', 'KW', 'OM', 'QA', 'EG', 'DZ', 'MA', 'TN', 'LY', 'SD', 'IQ', 'JO', 'LB', 'PS', 'SY', 'YE', 'MR', 'SO']
  };
  function normalizeLocale(value) {
    const language = String(value || '').toLowerCase().split(/[-_]/)[0];
    return supported.includes(language) ? language : null;
  }
  function browserLocale(languages) {
    for (const value of languages || []) { const language = normalizeLocale(value); if (language) return language; }
    return 'en';
  }
  function countryLocale(country) {
    return Object.keys(countryGroups).find(language => countryGroups[language].includes(country)) || null;
  }
  // Dependency injection keeps the real resolution path testable without sending IP lookups.
  function createEngine({ storage, fetchCountry, languages, render, now = Date.now }) {
    let generation = 0;
    let current = 'en';
    let automatic = true;
    const read = key => { try { return storage?.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage?.setItem(key, value); } catch { /* Storage may be disabled or unavailable for file URLs. */ } };
    const remove = key => { try { storage?.removeItem(key); } catch {} };
    function show(language, auto) { current = language; automatic = auto; render(language, auto); }
    async function detect() {
      const request = ++generation;
      show(browserLocale(languages), true);
      let country;
      try {
        const cache = JSON.parse(read('king3.country.v1') || 'null');
        if (cache && /^[A-Z]{2}$/.test(cache.country) && cache.expires > now() && cache.expires <= now() + 86400000) country = cache.country;
      } catch {}
      if (!country) {
        try {
          country = String(await fetchCountry()).trim().toUpperCase();
          if (!/^[A-Z]{2}$/.test(country)) return;
          write('king3.country.v1', JSON.stringify({ country, expires: now() + 86400000 }));
        } catch { return; }
      }
      if (request === generation && automatic) show(countryLocale(country) || browserLocale(languages), true);
    }
    function choose(value) {
      if (value === 'auto') { remove('king3.language.v1'); return detect(); }
      const language = normalizeLocale(value);
      if (!language) return;
      generation++;
      write('king3.language.v1', language);
      show(language, false);
    }
    function start() {
      const preference = normalizeLocale(read('king3.language.v1'));
      if (preference) { show(preference, false); return Promise.resolve(); }
      return detect();
    }
    return { start, choose, get language() { return current; }, get automatic() { return automatic; } };
  }
  const api = { supported, normalizeLocale, countryLocale, browserLocale, createEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document || !root.King3Locales) return;

  const catalog = root.King3Locales;
  const names = { en: 'English', hi: 'हिन्दी', es: 'Español', fr: 'Français', ar: 'العربية', bn: 'বাংলা', pt: 'Português', id: 'Bahasa Indonesia', ur: 'اردو' };
  const select = document.querySelector('#language-select');
  const lookup = new Map(catalog.en.map((value, index) => [value, index]));
  const records = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script,style,svg,.provider-wordmarks,.wall-tile,.language-picker')) continue;
    const original = node.nodeValue;
    const index = lookup.get(original.trim());
    if (index !== undefined) records.push({ node, index, prefix: original.match(/^\s*/)[0], suffix: original.match(/\s*$/)[0] });
  }
  let locale = 'en';
  const t = index => catalog[locale][index];
  const extra = key => catalog.ui[locale][key];
  function render(language, automatic) {
    locale = language;
    document.documentElement.lang = language;
    document.documentElement.dir = ['ar', 'ur'].includes(language) ? 'rtl' : 'ltr';
    for (const { node, index, prefix, suffix } of records) node.nodeValue = prefix + t(index) + suffix;
    document.title = t(0);
    document.querySelector('meta[name="description"]').content = extra('description');
    document.querySelector('meta[property="og:title"]').content = 'King3 — ' + t(90);
    document.querySelector('meta[property="og:description"]').content = extra('description');
    select.options[0].textContent = extra('auto') + (automatic ? ' · ' + names[language] : '');
    select.value = automatic ? 'auto' : language;
    select.setAttribute('aria-label', extra('language'));
    select.title = extra('language');
    document.querySelector('#language-status').textContent = extra('language') + ': ' + names[language];
    document.querySelector('.menu-toggle').setAttribute('aria-label', extra(document.querySelector('#mobile-nav').hidden ? 'openMenu' : 'closeMenu'));
    document.querySelector('.desktop-nav').setAttribute('aria-label', extra('navigation'));
    document.querySelector('.mobile-nav').setAttribute('aria-label', extra('navigation'));
    document.querySelector('.site-header .brand').setAttribute('aria-label', 'King3 · ' + t(2));
    document.querySelector('.hero-image').alt = extra('heroAlt');
    document.querySelector('.hero-official-logo').alt = extra('logoAlt');
    document.querySelector('.header-download').setAttribute('aria-label', t(6));
    document.querySelector('.header-download').title = t(6);
    document.querySelector('#game-wall').setAttribute('aria-label', extra('gameWall'));
    document.querySelector('.universe-range').setAttribute('aria-label', extra('gameTypes'));
    document.querySelector('.provider-wordmarks').setAttribute('aria-label', t(119));
    document.querySelectorAll('.provider-wordmarks>a').forEach(link => { link.setAttribute('aria-label', t(146) + ' · ' + link.dataset.providerName); link.title = t(146); });
    document.querySelector('#responsible-dialog .dialog-close').setAttribute('aria-label', extra('close'));
    document.querySelector('#privacy-dialog .dialog-close').setAttribute('aria-label', extra('close'));
    document.querySelector('[data-language-privacy]').textContent = extra('privacyLanguage');
    refreshGameLabels();
    document.dispatchEvent(new CustomEvent('king3:languagechange'));
  }
  function refreshGameLabels() {
    document.querySelectorAll('.wall-tile').forEach(tile => {
      const category = tile.querySelector('small');
      if (!category.dataset.i18nCategory) category.dataset.i18nCategory = lookup.get(category.textContent.trim());
      category.textContent = t(Number(category.dataset.i18nCategory));
      tile.setAttribute('aria-label', t(tile.dataset.destination === 'apk' ? 6 : 15) + ' · ' + tile.querySelector('strong').textContent);
    });
  }
  let storage;
  try { storage = root.localStorage; } catch {}
  const engine = createEngine({
    storage, languages: navigator.languages?.length ? navigator.languages : [navigator.language], render,
    fetchCountry: async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      try {
        const response = await fetch('https://ipapi.co/country_code/', { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
        if (!response.ok) throw new Error('Country lookup unavailable');
        return await response.text();
      } finally { clearTimeout(timer); }
    }
  });
  root.King3I18n = Object.freeze({ t, extra, refreshGameLabels, get language() { return locale; } });
  select.addEventListener('change', () => engine.choose(select.value));
  engine.start();
})(typeof window === 'undefined' ? globalThis : window);
