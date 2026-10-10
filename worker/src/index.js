// Inside Info bot v2 - Cloudflare Worker (Telegram webhook + cron dispatcher)
const CATS = ['crypto', 'finance', 'world', 'bd'];
const LANGS = { en: 'English', bn: 'বাংলা', hi: 'हिन्दी', ru: 'Русский', zh: '中文' };
const I = {
  en: {
    welcome: "👋 Welcome to <b>Inside Info</b>!\nReal-time Crypto, Finance, World & Bangladesh news, summarized by AI.\nChoose a section 👇",
    latest: '📰 Latest', crypto: '🪙 Crypto', finance: '💹 Finance', world: '🌍 World', bd: '🇧🇩 Bangladesh',
    fear: '😨 Fear & Greed', prices: '💰 Live Prices', calc: '🧮 Calculator', movers: '🏆 Top Movers',
    settings: '🔔 Alerts', language: '🌐 Language',
    noNews: 'No news yet.', settingsTitle: '🔔 <b>Alert settings</b>\nToggle sections & choose importance:',
    modeAll: 'All (5+)', modeImp: 'Important (7+)', modeBrk: 'Breaking only (9+)', impact: 'Impact',
    fgTitle: 'Crypto Fear & Greed Index', fgToday: 'Today', fgWeek: '1 Week', fgMonth: '1 Month',
    fgNames: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'],
    yday: 'Yesterday', wago: '1 week ago', mago: '1 month ago', avg: 'Average', low: 'Low', high: 'High',
    vol: 'Volume', thisM: 'This month', lastM: 'Last month', range24: '24h range', refresh: '🔄 Refresh',
    calcHelp: "🧮 <b>Crypto Calculator</b>\nSend an amount and a coin name (example: 5 eth). Result is shown in USDT.",
    gvol: "Global 24h volume (all exchanges)",
    calcNF: 'Coin not found in the top 100.', gain: '🟢 Top Gainers (24h)', lose: '🔴 Top Losers (24h)',
    err: 'Data is temporarily unavailable. Please try again.',
  },
  bn: {
    welcome: "👋 <b>Inside Info</b>-এ স্বাগতম!\nক্রিপ্টো, ফাইন্যান্স, বিশ্ব ও বাংলাদেশের খবর, AI সামারি সহ।\nনিচ থেকে সেকশন বেছে নিন 👇",
    latest: '📰 সর্বশেষ', crypto: '🪙 ক্রিপ্টো', finance: '💹 ফাইন্যান্স', world: '🌍 বিশ্ব', bd: '🇧🇩 বাংলাদেশ',
    fear: '😨 ফিয়ার অ্যান্ড গ্রিড', prices: '💰 লাইভ প্রাইস', calc: '🧮 ক্যালকুলেটর', movers: '🏆 টপ মুভার্স',
    settings: '🔔 অ্যালার্ট', language: '🌐 ভাষা',
    noNews: 'এখনো কোনো খবর নেই।', settingsTitle: '🔔 <b>অ্যালার্ট সেটিংস</b>\nসেকশন অন/অফ করুন ও গুরুত্ব বেছে নিন:',
    modeAll: 'সব (5+)', modeImp: 'গুরুত্বপূর্ণ (7+)', modeBrk: 'শুধু ব্রেকিং (9+)', impact: 'প্রভাব',
    fgTitle: 'ক্রিপ্টো ফিয়ার অ্যান্ড গ্রিড ইনডেক্স', fgToday: 'আজ', fgWeek: '১ সপ্তাহ', fgMonth: '১ মাস',
    fgNames: ['চরম ভয়', 'ভয়', 'নিরপেক্ষ', 'লোভ', 'চরম লোভ'],
    yday: 'গতকাল', wago: '১ সপ্তাহ আগে', mago: '১ মাস আগে', avg: 'গড়', low: 'সর্বনিম্ন', high: 'সর্বোচ্চ',
    vol: 'ভলিউম', thisM: 'এই মাস', lastM: 'গত মাস', range24: '২৪ ঘণ্টার রেঞ্জ', refresh: '🔄 রিফ্রেশ',
    calcHelp: "🧮 <b>ক্রিপ্টো ক্যালকুলেটর</b>\nপরিমাণ ও কয়েনের নাম লিখে পাঠান (যেমন: 5 eth)। ফলাফল USDT-তে দেখাবে।",
    gvol: "সব এক্সচেঞ্জ মিলিয়ে ২৪ঘ ভলিউম",
    calcNF: 'টপ ১০০-তে এই কয়েন পাওয়া যায়নি।', gain: '🟢 সর্বোচ্চ বৃদ্ধি (২৪ঘ)', lose: '🔴 সর্বোচ্চ পতন (২৪ঘ)',
    err: 'ডেটা এখন পাওয়া যাচ্ছে না, আবার চেষ্টা করুন।',
  },
  hi: {
    welcome: "👋 <b>Inside Info</b> में स्वागत है!\nक्रिप्टो, फाइनेंस, विश्व और बांग्लादेश की खबरें, AI सारांश के साथ।\nनीचे से सेक्शन चुनें 👇",
    latest: '📰 ताज़ा', crypto: '🪙 क्रिप्टो', finance: '💹 फाइनेंस', world: '🌍 विश्व', bd: '🇧🇩 बांग्लादेश',
    fear: '😨 फियर एंड ग्रीड', prices: '💰 लाइव प्राइस', calc: '🧮 कैलकुलेटर', movers: '🏆 टॉप मूवर्स',
    settings: '🔔 अलर्ट', language: '🌐 भाषा',
    noNews: 'अभी कोई खबर नहीं।', settingsTitle: '🔔 <b>अलर्ट सेटिंग्स</b>\nसेक्शन चालू/बंद करें और महत्व चुनें:',
    modeAll: 'सभी (5+)', modeImp: 'महत्वपूर्ण (7+)', modeBrk: 'सिर्फ़ ब्रेकिंग (9+)', impact: 'प्रभाव',
    fgTitle: 'क्रिप्टो फियर एंड ग्रीड इंडेक्स', fgToday: 'आज', fgWeek: '1 सप्ताह', fgMonth: '1 महीना',
    fgNames: ['अत्यधिक डर', 'डर', 'तटस्थ', 'लालच', 'अत्यधिक लालच'],
    yday: 'कल', wago: '1 सप्ताह पहले', mago: '1 महीने पहले', avg: 'औसत', low: 'न्यूनतम', high: 'अधिकतम',
    vol: 'वॉल्यूम', thisM: 'इस महीने', lastM: 'पिछला महीना', range24: '24 घंटे की रेंज', refresh: '🔄 रिफ्रेश',
    calcHelp: "🧮 <b>क्रिप्टो कैलकुलेटर</b>\nमात्रा और कॉइन का नाम लिखकर भेजें (जैसे: 5 eth)। नतीजा USDT में दिखेगा।",
    gvol: "सभी एक्सचेंज का 24घं वॉल्यूम",
    calcNF: 'टॉप 100 में यह कॉइन नहीं मिला।', gain: '🟢 टॉप गेनर्स (24घं)', lose: '🔴 टॉप लूज़र्स (24घं)',
    err: 'डेटा अभी उपलब्ध नहीं है, फिर कोशिश करें।',
  },
  ru: {
    welcome: "👋 Добро пожаловать в <b>Inside Info</b>!\nКрипто, финансы, мир и Бангладеш: новости с AI-сводкой.\nВыберите раздел 👇",
    latest: '📰 Последние', crypto: '🪙 Крипто', finance: '💹 Финансы', world: '🌍 Мир', bd: '🇧🇩 Бангладеш',
    fear: '😨 Страх и жадность', prices: '💰 Цены онлайн', calc: '🧮 Калькулятор', movers: '🏆 Лидеры рынка',
    settings: '🔔 Уведомления', language: '🌐 Язык',
    noNews: 'Новостей пока нет.', settingsTitle: '🔔 <b>Настройки уведомлений</b>\nВключайте разделы и выберите важность:',
    modeAll: 'Все (5+)', modeImp: 'Важные (7+)', modeBrk: 'Только срочные (9+)', impact: 'Влияние',
    fgTitle: 'Индекс страха и жадности', fgToday: 'Сегодня', fgWeek: '1 неделя', fgMonth: '1 месяц',
    fgNames: ['Крайний страх', 'Страх', 'Нейтрально', 'Жадность', 'Крайняя жадность'],
    yday: 'Вчера', wago: 'Неделю назад', mago: 'Месяц назад', avg: 'Среднее', low: 'Мин', high: 'Макс',
    vol: 'Объём', thisM: 'Этот месяц', lastM: 'Прошлый месяц', range24: 'Диапазон 24ч', refresh: '🔄 Обновить',
    calcHelp: "🧮 <b>Крипто-калькулятор</b>\nОтправьте сумму и название монеты (пример: 5 eth). Результат в USDT.",
    gvol: "Объём за 24ч (все биржи)",
    calcNF: 'Монета не найдена в топ-100.', gain: '🟢 Лидеры роста (24ч)', lose: '🔴 Лидеры падения (24ч)',
    err: 'Данные временно недоступны. Попробуйте ещё раз.',
  },
  zh: {
    welcome: "👋 欢迎使用 <b>Inside Info</b>！\n加密货币、金融、国际和孟加拉国新闻，AI 智能摘要。\n请选择栏目 👇",
    latest: '📰 最新', crypto: '🪙 加密货币', finance: '💹 金融', world: '🌍 国际', bd: '🇧🇩 孟加拉国',
    fear: '😨 恐惧与贪婪', prices: '💰 实时价格', calc: '🧮 计算器', movers: '🏆 涨跌榜',
    settings: '🔔 提醒', language: '🌐 语言',
    noNews: '暂无新闻。', settingsTitle: '🔔 <b>提醒设置</b>\n开关栏目并选择重要程度：',
    modeAll: '全部 (5+)', modeImp: '重要 (7+)', modeBrk: '仅突发 (9+)', impact: '影响',
    fgTitle: '加密货币恐惧与贪婪指数', fgToday: '今天', fgWeek: '1周', fgMonth: '1个月',
    fgNames: ['极度恐惧', '恐惧', '中性', '贪婪', '极度贪婪'],
    yday: '昨天', wago: '1周前', mago: '1个月前', avg: '平均', low: '最低', high: '最高',
    vol: '成交量', thisM: '本月', lastM: '上月', range24: '24小时区间', refresh: '🔄 刷新',
    calcHelp: "🧮 <b>加密货币计算器</b>\n发送数量和币种名称（例如：5 eth）。结果以 USDT 显示。",
    gvol: "24小时全网成交量",
    calcNF: '前100名中没有找到该币种。', gain: '🟢 24小时涨幅榜', lose: '🔴 24小时跌幅榜',
    err: '数据暂时不可用，请稍后重试。',
  },
};
const MENU = ['latest', 'crypto', 'finance', 'world', 'bd', 'fear', 'prices', 'calc', 'movers', 'settings', 'language'];
// Telegram Bot API 9.4: button color. primary = blue, success = green, danger = red
const STYLE = { latest: 'primary', crypto: 'success', finance: 'primary', world: 'primary', bd: 'success', fear: 'danger', prices: 'success', calc: 'primary', movers: 'danger' };
const ADMIN_BTN = '⚙️ Admin';
const LABEL2KEY = {};
for (const l in I) for (const k of MENU) LABEL2KEY[I[l][k]] = k;
const CALC_RE = /^\s*(\d[\d,]*\.?\d*|\.\d+)\s*([a-z][a-z0-9]{1,9})(?:\s*(?:to|in|=|->|→)\s*([a-z][a-z0-9]{1,9}))?\s*$/i;

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icon = (s) => (s >= 9 ? '🔴' : s >= 7 ? '🟠' : '🟢');
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`; };
// news-er somoy user-er language onujayi timezone-e dekhay (bn=GMT+6, hi=GMT+5:30, ru=GMT+3, zh=GMT+8, en=UTC)
const TZ = { en: [0, 'UTC'], bn: [360, 'GMT+6'], hi: [330, 'GMT+5:30'], ru: [180, 'GMT+3'], zh: [480, 'GMT+8'] };
const fmtDT = (iso, lang) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const [off, label] = TZ[lang] || TZ.en;
  const x = new Date(d.getTime() + off * 60000);
  return `${pad(x.getUTCDate())}.${pad(x.getUTCMonth() + 1)}.${x.getUTCFullYear()} ${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())} ${label}`;
};
const btn = (text, data, style) => ({ text, callback_data: data, ...(style ? { style } : {}) });
const num = (n) => (n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 2 : 4 }) : n === 0 ? '0' : n.toFixed(Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(n))))).replace(/0+$/, '').replace(/\.$/, ''));
const price = (n) => (n >= 1000 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : num(n));
const usd = (n) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n).toLocaleString('en-US')}`);
const amt = (n, s) => `${n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(2)} ${s}`;
const pct = (n) => `${n >= 0 ? '🟢 +' : '🔴 '}${n.toFixed(2)}%`;

const tg = (env, m, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const send = (env, chat, text, extra = {}) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const show = (env, chat, mid, text, kb) => {
  const body = { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: kb } };
  return mid ? tg(env, 'editMessageText', { ...body, message_id: mid }) : tg(env, 'sendMessage', body);
};
const sb = (env, path, opt = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...opt, headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const sbj = async (env, path, opt) => { const r = await sb(env, path, opt); const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch (e) { return null; } };
const count = async (env, path) => { const r = await sb(env, path + '&limit=1', { headers: { Prefer: 'count=exact' } }); return (r.headers.get('content-range') || '/0').split('/')[1]; };
const getSettings = async (env) => Object.fromEntries(((await sbj(env, 'settings?select=key,value')) || []).map((r) => [r.key, r.value]));
const setSetting = (env, key, value) => sb(env, 'settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key, value: String(value) }) });
const patchUser = (env, id, data) => sb(env, `users?chat_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) });

async function getUser(env, id, from) {
  const uname = (from && from.username) || null, fname = (from && from.first_name) || null;
  const r = await sbj(env, `users?chat_id=eq.${id}&select=*`);
  if (r && r.length) {
    const u = r[0];
    if (from && (u.username !== uname || u.first_name !== fname)) {
      await patchUser(env, id, { username: uname, first_name: fname });
      u.username = uname; u.first_name = fname;
    }
    return u;
  }
  const c = await sbj(env, 'users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ chat_id: id, username: uname, first_name: fname }) });
  return c[0];
}

const menuKb = (lang, isAdmin) => {
  const t = I[lang];
  const b = (k) => ({ text: t[k], ...(STYLE[k] ? { style: STYLE[k] } : {}) });
  const rows = [[b('latest'), b('crypto')], [b('finance'), b('world')], [b('bd'), b('fear')], [b('prices'), b('calc')], [b('movers'), b('settings')], [b('language')]];
  if (isAdmin) rows[5].push({ text: ADMIN_BTN, style: 'danger' });
  return { keyboard: rows, resize_keyboard: true };
};
const langKb = () => ({ inline_keyboard: Object.entries(LANGS).map(([k, v]) => [{ text: v, callback_data: `lang:${k}` }]) });
const askLang = (env, id) => send(env, id, '🌐 Choose your language / ভাষা বেছে নিন', { reply_markup: langKb() });
const home = (env, id, lang, isAdmin) => send(env, id, I[lang].welcome, { reply_markup: menuKb(lang, isAdmin) });

// ---------- news ----------
async function showNews(env, id, lang, cat) {
  const t = I[lang];
  let q = `news?select=summaries,score,published_at,created_at&score=gte.${cat === 'bd' ? 3 : 5}&order=published_at.desc.nullslast,created_at.desc&limit=6`;
  if (cat !== 'latest') q += `&category=eq.${cat}`;
  const rows = await sbj(env, q);
  if (!rows || !rows.length) return send(env, id, t.noNews);
  const text = rows.map((n) => `${icon(n.score)} ${esc(n.summaries[lang] || n.summaries.en)}\n📊 ${t.impact}: ${n.score}/10${n.published_at ? ' · ' + fmtDT(n.published_at, lang) : ''}`).join('\n\n');
  return send(env, id, text.slice(0, 4000));
}

function settingsView(env, id, user, mid) {
  const t = I[user.lang || 'en'];
  const kb = CATS.map((c) => { const on = user.cats.includes(c); return [btn(`${on ? '✅' : '❌'} ${t[c]}`, `cat:${c}`, on ? 'success' : 'danger')]; });
  for (const [n, l] of [[5, t.modeAll], [7, t.modeImp], [9, t.modeBrk]]) kb.push([btn(`${user.min_score === n ? '🔘' : '⚪'} ${l}`, `mode:${n}`, user.min_score === n ? 'primary' : undefined)]);
  return show(env, id, mid, t.settingsTitle, kb);
}

// ---------- Fear & Greed ----------
const fgIdx = (v) => (v <= 24 ? 0 : v <= 46 ? 1 : v <= 54 ? 2 : v <= 75 ? 3 : 4);
const FG_EMOJI = ['😱', '😨', '😐', '🙂', '🤑'];
const SPARK = '▁▂▃▄▅▆▇█';
async function fgData() {
  const r = await fetch('https://api.alternative.me/fng/?limit=31', { cf: { cacheTtl: 300, cacheEverything: true } });
  const j = await r.json();
  return j.data.map((d) => ({ v: Number(d.value), ts: Number(d.timestamp) })); // newest first
}
async function fgView(env, id, mid, lang, mode) {
  const t = I[lang];
  let data = null;
  try { data = await fgData(); } catch (e) { /* ignore */ }
  if (!data || data.length < 8) return show(env, id, mid, t.err, []);
  const lab = (v) => t.fgNames[fgIdx(v)];
  const kb = [[['today', t.fgToday], ['week', t.fgWeek], ['month', t.fgMonth]].map(([m, l]) => btn(l, `fg:${m}`, m === mode ? 'primary' : undefined))];
  let text;
  if (mode === 'today') {
    const cur = data[0].v, n = Math.round(cur / 10);
    const row = (label, i) => (data[i] ? `${label}: <b>${data[i].v}</b> (${lab(data[i].v)})\n` : '');
    text = `${FG_EMOJI[fgIdx(cur)]} <b>${t.fgTitle}</b>\n\n<b>${t.fgToday}: ${cur}</b> — ${lab(cur)}\n${'█'.repeat(n)}${'░'.repeat(10 - n)}\n\n${row(t.yday, 1)}${row(t.wago, 7)}${row(t.mago, 30)}`;
  } else {
    const days = mode === 'week' ? 7 : 30;
    const vals = data.slice(0, days).map((d) => d.v).reverse(); // oldest -> newest
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const spark = vals.map((v) => SPARK[Math.min(7, Math.floor(v / 12.5))]).join('');
    text = `${FG_EMOJI[fgIdx(avg)]} <b>${t.fgTitle}</b> — ${mode === 'week' ? t.fgWeek : t.fgMonth}\n\n<code>${spark}</code>\n${vals[0]} → ${vals[vals.length - 1]}\n\n${t.avg}: <b>${avg}</b> (${lab(avg)})\n${t.low}: ${Math.min(...vals)} · ${t.high}: ${Math.max(...vals)}`;
  }
  return show(env, id, mid, text, kb);
}

// ---------- Market data (Kraken / Binance / CoinGecko / CryptoCompare + Supabase cache) ----------
async function jget(url, init = {}, ms = 8000) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
const CF_CACHE = { cacheTtlByStatus: { '200-299': 60, '400-599': 0 }, cacheEverything: true };
const cacheGet = async (env, key) => { const r = await sbj(env, `market_cache?key=eq.${key}&select=value,updated_at`); return Array.isArray(r) && r[0] ? r[0] : null; };
const cacheSet = (env, key, value) => sb(env, 'market_cache', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }) });

// top 100 coin: [{s:'BTC', p:price, c:change24h, v:volume24h}]
async function top100(env) {
  let list = null;
  const g = await jget('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false',
    { headers: { 'User-Agent': 'insideinfo-bot', Accept: 'application/json', ...(env.CG_KEY ? { 'x-cg-demo-api-key': env.CG_KEY } : {}) }, cf: CF_CACHE });
  if (Array.isArray(g) && g.length) list = g.map((x) => ({ s: String(x.symbol).toUpperCase(), p: x.current_price, c: x.price_change_percentage_24h, v: x.total_volume }));
  if (!list) {
    const cc = await jget('https://min-api.cryptocompare.com/data/top/mktcapfull?limit=100&tsym=USD', { cf: CF_CACHE });
    if (cc && Array.isArray(cc.Data)) list = cc.Data.filter((d) => d.RAW && d.RAW.USD).map((d) => ({ s: String(d.CoinInfo.Name).toUpperCase(), p: d.RAW.USD.PRICE, c: d.RAW.USD.CHANGEPCT24HOUR, v: d.RAW.USD.TOTALVOLUME24HTO }));
  }
  if (list && list.length) { await cacheSet(env, 'top100', list); return list; }
  const c = await cacheGet(env, 'top100'); // live na paile shesh jana data
  return c ? c.value : null;
}

// BTC/ETH stats - Kraken (prothom), na paile Binance
async function krakenStats(pair) {
  const now = Math.floor(Date.now() / 1000), d = new Date();
  const thisM = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
  const prevM = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) / 1000;
  const base = 'https://api.kraken.com/0/public';
  const [tk, a, b, c] = await Promise.all([
    jget(`${base}/Ticker?pair=${pair}`),
    jget(`${base}/OHLC?pair=${pair}&interval=5&since=${now - 6 * 3600 - 600}`),
    jget(`${base}/OHLC?pair=${pair}&interval=60&since=${now - 7 * 86400 - 3600}`),
    jget(`${base}/OHLC?pair=${pair}&interval=1440&since=${prevM - 86400}`),
  ]);
  const rows = (j) => { if (!j || (j.error && j.error.length) || !j.result) return null; const k = Object.keys(j.result).find((x) => x !== 'last'); return k ? j.result[k] : null; };
  const T = tk && tk.result ? Object.values(tk.result)[0] : null;
  const m5 = rows(a), h1 = rows(b), d1 = rows(c);
  if (!T || !m5 || !h1 || !d1 || m5.length < 12 || h1.length < 24 || d1.length < 5) return null;
  const cn = (x) => ({ t: x[0], o: +x[1], c: +x[4], w: +x[5] || +x[4], v: +x[6] });
  const M5 = m5.map(cn), H1 = h1.map(cn), D1 = d1.map(cn);
  const sum = (arr) => ({ q: arr.reduce((s, x) => s + x.v * x.w, 0), b: arr.reduce((s, x) => s + x.v, 0) });
  const last = (arr, n) => arr.slice(-n);
  const chg = (arr, n) => { const s = last(arr, n); return (s[s.length - 1].c / s[0].o - 1) * 100; };
  const inM = (lo, hi) => sum(D1.filter((x) => x.t >= lo && x.t < hi));
  const nz = (o) => (o.b > 0 ? o : null);
  return {
    src: 'Kraken', quote: 'USD', last: +T.c[0], high: +T.h[1], low: +T.l[1],
    c1h: chg(M5, 12), c6h: chg(M5, 72), c24h: chg(H1, 24), c7d: chg(H1, 168), c30d: chg(D1, 30),
    v1h: sum(last(M5, 12)), v6h: sum(last(M5, 72)), v24h: { b: +T.v[1], q: +T.v[1] * +T.p[1] }, v7d: sum(last(H1, 168)), v30d: sum(last(D1, 30)),
    vm: nz(inM(thisM, now + 1)), vlm: nz(inM(prevM, thisM)),
  };
}
async function bn(path) {
  for (const base of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    const j = await jget(base + path, {}, 6000);
    if (j) return j;
  }
  return null;
}
async function binanceStats(sym) {
  const [t24, m5, h1, d1, mo] = await Promise.all([
    bn(`/api/v3/ticker/24hr?symbol=${sym}`), bn(`/api/v3/klines?symbol=${sym}&interval=5m&limit=72`),
    bn(`/api/v3/klines?symbol=${sym}&interval=1h&limit=168`), bn(`/api/v3/klines?symbol=${sym}&interval=1d&limit=30`),
    bn(`/api/v3/klines?symbol=${sym}&interval=1M&limit=2`),
  ]);
  if (!t24 || !m5 || !h1 || !d1) return null;
  const vq = (k, n) => ({ q: k.slice(-n).reduce((a, c) => a + Number(c[7]), 0), b: k.slice(-n).reduce((a, c) => a + Number(c[5]), 0) });
  const chg = (k, n) => { const s = k.slice(-n); return (Number(s[s.length - 1][4]) / Number(s[0][1]) - 1) * 100; };
  const mv = (c) => ({ q: Number(c[7]), b: Number(c[5]) });
  return {
    src: 'Binance', quote: 'USDT', last: Number(t24.lastPrice), high: Number(t24.highPrice), low: Number(t24.lowPrice),
    c1h: chg(m5, 12), c6h: chg(m5, 72), c24h: Number(t24.priceChangePercent), c7d: chg(h1, 168), c30d: chg(d1, 30),
    v1h: vq(m5, 12), v6h: vq(m5, 72), v24h: { q: Number(t24.quoteVolume), b: Number(t24.volume) }, v7d: vq(h1, 168), v30d: vq(d1, 30),
    vm: mo && mo.length >= 2 ? mv(mo[1]) : null, vlm: mo && mo.length >= 2 ? mv(mo[0]) : null,
  };
}
async function getStats(sym) {
  const s = await krakenStats(sym === 'BTC' ? 'XBTUSD' : 'ETHUSD');
  return s || (await binanceStats(sym + 'USDT'));
}
function coinBlock(sym, name, s, t) {
  const V = (label, o) => `${label}: ${usd(o.q)} · ${amt(o.b, sym)}`;
  return [
    `<b>${name}</b>  $${price(s.last)}`,
    `${t.range24}: $${price(s.low)} – $${price(s.high)}`,
    `1h ${pct(s.c1h)} · 6h ${pct(s.c6h)} · 24h ${pct(s.c24h)}`,
    `7d ${pct(s.c7d)} · 30d ${pct(s.c30d)}`,
    '',
    `📊 <b>${t.vol}</b> · ${s.src} (${s.quote} · ${sym})`,
    s.gv ? `🌐 ${t.gvol}: ${usd(s.gv)}` : null,
    V('1h', s.v1h), V('6h', s.v6h), V('24h', s.v24h), V('7d', s.v7d), V('30d', s.v30d),
    s.vm ? V(t.thisM, s.vm) : null, s.vlm ? V(t.lastM, s.vlm) : null,
  ].filter((x) => x !== null).join('\n');
}
async function pricesView(env, id, mid, lang) {
  const t = I[lang];
  const kb = [[btn(t.refresh, 'px:r', 'primary')]];
  let btc = await getStats('BTC'), eth = btc ? await getStats('ETH') : null, note = '';
  if (btc && eth) {
    await cacheSet(env, 'stats', { btc, eth });
  } else {
    // live na paile runner/ager cache
    const c = await cacheGet(env, 'stats');
    if (c && c.value && c.value.btc && c.value.eth) {
      btc = c.value.btc; eth = c.value.eth;
      note = ` (cached ${Math.max(1, Math.round((Date.now() - new Date(c.updated_at)) / 60000))} min)`;
    } else { btc = null; eth = null; }
  }
  const list = await top100(env);
  const d = new Date();
  const clock = `🕒 ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC${note}`;
  if (btc && eth) {
    if (list) { const gv = (s) => { const x = list.find((y) => y.s === s); return x && x.v ? x.v : null; }; btc.gv = gv('BTC'); eth.gv = gv('ETH'); }
    return show(env, id, mid, `${coinBlock('BTC', '₿ Bitcoin', btc, t)}\n\n${coinBlock('ETH', 'Ξ Ethereum', eth, t)}\n\n${clock}`, kb);
  }
  // exchange data kothao paoa jay ni: top-100 theke shudhu price, 24h change ar global volume
  const row = (sy) => (list ? list.find((x) => x.s === sy) : null);
  const b = row('BTC'), e = row('ETH');
  if (!b || !e) return show(env, id, mid, t.err, kb);
  const simple = (name, x) => [`<b>${name}</b>  $${price(x.p)}`, x.c != null ? `24h ${pct(x.c)}` : null, x.v ? `🌐 ${t.gvol}: ${usd(x.v)}` : null].filter((v) => v !== null).join('\n');
  return show(env, id, mid, `${simple('₿ Bitcoin', b)}\n\n${simple('Ξ Ethereum', e)}\n\n${clock}`, kb);
}

async function moversView(env, id, lang) {
  const t = I[lang];
  const list = await top100(env);
  if (!list) return send(env, id, t.err);
  const c = list.filter((x) => x.c != null).sort((a, b) => b.c - a.c);
  const line = (x, i) => `${i + 1}. <b>${esc(x.s)}</b>  $${num(x.p)}  ${pct(x.c)}`;
  return send(env, id, `<b>${t.gain}</b>\n${c.slice(0, 5).map(line).join('\n')}\n\n<b>${t.lose}</b>\n${c.slice(-5).reverse().map(line).join('\n')}`);
}
async function calc(env, id, lang, amount, from, to) {
  const t = I[lang];
  const list = await top100(env);
  if (!list) return send(env, id, t.err);
  const usdPrice = (s) => { s = s.toUpperCase(); if (['USDT', 'USD', 'USDC'].includes(s)) return 1; const c = list.find((x) => x.s === s); return c ? c.p : null; };
  const a = Number(String(amount).replace(/,/g, ''));
  const target = to || 'usdt';
  const p1 = usdPrice(from), p2 = usdPrice(target);
  if (!p1 || !p2 || !isFinite(a)) return send(env, id, t.calcNF);
  const out = (a * p1) / p2, T = target.toUpperCase(), F = from.toUpperCase();
  const stable = ['USDT', 'USD', 'USDC'].includes(T);
  return send(env, id, `🧮 <b>${num(a)} ${esc(F)}</b> = <b>${num(out)} ${esc(stable ? 'USDT' : T)}</b>\n\n1 ${esc(F)} ≈ $${num(p1)}${stable ? '' : `\n${num(a)} ${esc(F)} ≈ $${num(a * p1)}`}`);
}
async function diag(env, id) {
  const tests = [
    ['Kraken', 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD'],
    ['Binance vision', 'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT'],
    ['Binance main', 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'],
    ['CoinGecko', 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=1'],
    ['CryptoCompare', 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD'],
    ['Fear&Greed', 'https://api.alternative.me/fng/?limit=1'],
  ];
  const lines = await Promise.all(tests.map(async ([n, u]) => {
    const t0 = Date.now();
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'insideinfo-bot', ...(n === 'CoinGecko' && env.CG_KEY ? { 'x-cg-demo-api-key': env.CG_KEY } : {}) }, signal: AbortSignal.timeout(8000) });
      return `${r.ok ? '✅' : '❌'} ${n}: ${r.status} (${Date.now() - t0}ms)`;
    } catch (e) { return `❌ ${n}: ${esc(e.message || e)}`; }
  }));
  const c = await cacheGet(env, 'top100');
  const cs = await cacheGet(env, 'stats');
  lines.push(`🗄 cache top100: ${c ? c.updated_at : 'empty'}`);
  lines.push(`🗄 cache stats: ${cs ? cs.updated_at : 'empty'}`);
  return send(env, id, `🔧 <b>Diagnostics</b>\n${lines.join('\n')}`);
}

// ---------- GitHub trigger ----------
async function dispatch(env) {
  if (!env.GH_TOKEN || !env.GH_REPO) return 'GH_TOKEN / GH_REPO secret set kora nai';
  const r = await fetch(`https://api.github.com/repos/${env.GH_REPO}/actions/workflows/news.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'insideinfo-bot', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main' }),
  });
  return r.status === 204 ? 'ok' : `GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`;
}

// ---------- ADMIN ----------
const back = [btn('⬅️ Admin', 'ad:home')];
async function adminHome(env, id, mid) {
  const s = await getSettings(env);
  const kb = [
    [btn('📊 Stats', 'ad:stats', 'primary'), btn('👥 Users', 'ad:us:0', 'primary')],
    [btn('🤖 AI Provider', 'ad:ai'), btn('📡 Sources', 'ad:src')],
    [btn(s.paused === '1' ? '▶️ Resume fetching' : '⏸ Pause fetching', 'ad:pause', s.paused === '1' ? 'success' : 'danger'), btn('🔄 Fetch now', 'ad:run', 'success')],
    [btn(`🔔 Global min score: ${s.push_min_score || 5}`, 'ad:min')],
  ];
  const help = '⚙️ <b>Admin Panel</b>\n\nCommands:\n/addsource type|name|category|url\n  (type: rss/telegram/api, category: crypto/finance/world/bd)\n/delsource ID\n/setmodel gemini MODEL\n/setmodel groq MODEL\n/broadcast message\n/diag (API connection test)';
  return show(env, id, mid, help, kb);
}
async function usersView(env, id, mid, page) {
  const per = 12;
  const rows = (await sbj(env, `users?select=chat_id,username,first_name,lang,created_at&order=created_at.desc&limit=${per}&offset=${page * per}`)) || [];
  const total = Number(await count(env, 'users?select=chat_id'));
  for (const u of rows) {
    if (!u.username && !u.first_name) { // purano user: Telegram theke nam anche
      try {
        const j = await (await tg(env, 'getChat', { chat_id: u.chat_id })).json();
        const c = j.result || {};
        u.username = c.username || null; u.first_name = c.first_name || c.title || '-';
        await patchUser(env, u.chat_id, { username: u.username, first_name: u.first_name });
      } catch (e) { /* ignore */ }
    }
  }
  const lines = rows.map((u, i) => `${page * per + i + 1}. <a href="tg://user?id=${u.chat_id}">${esc(u.first_name || '-')}</a> ${u.username ? '@' + esc(u.username) : ''}\n    🆔 <code>${u.chat_id}</code> · ${u.lang || '-'} · ${fmtDate(u.created_at)}`);
  const nav = [];
  if (page > 0) nav.push(btn('⬅️ Prev', `ad:us:${page - 1}`));
  if ((page + 1) * per < total) nav.push(btn('Next ➡️', `ad:us:${page + 1}`));
  return show(env, id, mid, `👥 <b>Users (${total})</b>\n\n${lines.join('\n') || '-'}`, [...(nav.length ? [nav] : []), back]);
}
async function srcView(env, id, mid) {
  const rows = (await sbj(env, 'sources?select=id,name,category,enabled,last_status&order=id')) || [];
  const st = (r) => (r.last_status === 'ERR' ? ' ❌' : r.last_status === '0' ? ' ⚠️0' : r.last_status ? ` · ${r.last_status}` : '');
  const kb = rows.map((r) => [btn(`${r.enabled ? '✅' : '⏸'} #${r.id} ${r.name}${st(r)}`, `ad:st:${r.id}`, r.enabled ? undefined : 'danger')]);
  kb.push(back);
  return show(env, id, mid, '📡 <b>Sources</b> (tap = enable/disable)\n· N = last run-e N ta item, ⚠️0 = kichu paoa jay ni, ❌ = error', kb);
}
async function aiView(env, id, mid) {
  const s = await getSettings(env);
  const p = s.ai_provider || 'gemini';
  const kb = [[btn(`${p === 'gemini' ? '✅' : '⚪'} Gemini`, 'ad:setai:gemini', p === 'gemini' ? 'success' : undefined), btn(`${p === 'groq' ? '✅' : '⚪'} Groq`, 'ad:setai:groq', p === 'groq' ? 'success' : undefined)], back];
  return show(env, id, mid, `🤖 <b>AI provider:</b> ${p}\nGemini model: <code>${esc(s.gemini_model)}</code>\nGroq model: <code>${esc(s.groq_model)}</code>\n\nModel change: /setmodel groq MODEL_NAME\nPrimary fail hole onno provider auto fallback hobe.`, kb);
}
async function adminCmd(env, id, text) {
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ');
  if (cmd === '/admin') { await adminHome(env, id); return true; }
  if (cmd === '/users') { await usersView(env, id, null, 0); return true; }
  if (cmd === '/diag') { await diag(env, id); return true; }
  if (cmd === '/addsource') {
    const [type, name, category, url] = arg.split('|').map((s) => s.trim());
    if (!url || !['rss', 'telegram', 'api'].includes(type) || !CATS.includes(category)) { await send(env, id, 'Usage: /addsource rss|Name|crypto|https://...'); return true; }
    const r = await sb(env, 'sources', { method: 'POST', body: JSON.stringify({ type, name, category, url }) });
    await send(env, id, r.ok ? '✅ Source added' : '❌ ' + esc(await r.text()));
    return true;
  }
  if (cmd === '/delsource') { await sb(env, `sources?id=eq.${parseInt(arg)}`, { method: 'DELETE' }); await send(env, id, '🗑 Deleted'); return true; }
  if (cmd === '/setmodel') {
    const [p, model] = rest;
    if (!['gemini', 'groq'].includes(p) || !model) { await send(env, id, 'Usage: /setmodel groq openai/gpt-oss-120b'); return true; }
    await setSetting(env, `${p}_model`, model); await send(env, id, `✅ ${p} model = ${esc(model)}`); return true;
  }
  if (cmd === '/broadcast') {
    if (!arg) { await send(env, id, 'Usage: /broadcast your message'); return true; }
    await sb(env, 'broadcasts', { method: 'POST', body: JSON.stringify({ text: arg }) });
    await send(env, id, '📢 Queued. Next fetch run-e (5 min-er moddhe) sobar kache jabe.'); return true;
  }
  return false;
}
async function adminCb(env, id, mid, d) {
  if (d === 'ad:home') return adminHome(env, id, mid);
  if (d.startsWith('ad:us:')) return usersView(env, id, mid, parseInt(d.split(':')[2]) || 0);
  if (d === 'ad:stats') {
    const [u, a, n, n24] = await Promise.all([count(env, 'users?select=chat_id'), count(env, 'users?select=chat_id&blocked=eq.false&lang=not.is.null'), count(env, 'news?select=id&score=gte.5'), count(env, `news?select=id&score=gte.5&created_at=gte.${new Date(Date.now() - 864e5).toISOString()}`)]);
    return show(env, id, mid, `📊 <b>Stats</b>\nUsers: ${u}\nActive: ${a}\nNews (score 5+): ${n}\nLast 24h: ${n24}`, [back]);
  }
  if (d === 'ad:ai') return aiView(env, id, mid);
  if (d.startsWith('ad:setai:')) { await setSetting(env, 'ai_provider', d.split(':')[2]); return aiView(env, id, mid); }
  if (d === 'ad:src') return srcView(env, id, mid);
  if (d.startsWith('ad:st:')) {
    const sid = d.split(':')[2];
    const [r] = (await sbj(env, `sources?id=eq.${sid}&select=enabled`)) || [];
    if (r) await sb(env, `sources?id=eq.${sid}`, { method: 'PATCH', body: JSON.stringify({ enabled: !r.enabled }) });
    return srcView(env, id, mid);
  }
  if (d === 'ad:pause') { const s = await getSettings(env); await setSetting(env, 'paused', s.paused === '1' ? '0' : '1'); return adminHome(env, id, mid); }
  if (d === 'ad:min') { const s = await getSettings(env); const cur = parseInt(s.push_min_score || 5); await setSetting(env, 'push_min_score', cur >= 9 ? 5 : cur + 2); return adminHome(env, id, mid); }
  if (d === 'ad:run') {
    const r = await dispatch(env);
    return show(env, id, mid, r === 'ok' ? '✅ Fetch trigger hoyeche. 1-3 minute-er moddhe notun news process hobe.' : `❌ ${esc(r)}`, [back]);
  }
}

// ---------- ROUTER ----------
async function onCb(q, env, admins) {
  const id = q.message.chat.id, mid = q.message.message_id, d = q.data;
  const isAdmin = admins.includes(String(id));
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
  const user = await getUser(env, id, q.from);
  const lang = user.lang || 'en';
  if (d.startsWith('lang:')) {
    const l = d.slice(5);
    if (!I[l]) return;
    await patchUser(env, id, { lang: l });
    await tg(env, 'deleteMessage', { chat_id: id, message_id: mid });
    return home(env, id, l, isAdmin);
  }
  if (d.startsWith('cat:')) {
    const c = d.slice(4);
    user.cats = user.cats.includes(c) ? user.cats.filter((x) => x !== c) : [...user.cats, c];
    await patchUser(env, id, { cats: user.cats });
    return settingsView(env, id, user, mid);
  }
  if (d.startsWith('mode:')) { user.min_score = parseInt(d.slice(5)); await patchUser(env, id, { min_score: user.min_score }); return settingsView(env, id, user, mid); }
  if (d.startsWith('fg:')) return fgView(env, id, mid, lang, d.slice(3));
  if (d === 'px:r') return pricesView(env, id, mid, lang);
  if (isAdmin && d.startsWith('ad:')) return adminCb(env, id, mid, d);
}

async function handle(u, env) {
  const admins = (env.ADMIN_IDS || '').split(',').map((s) => s.trim());
  if (u.callback_query) return onCb(u.callback_query, env, admins);
  const m = u.message;
  if (!m || !m.text) return;
  const id = m.chat.id, text = m.text.trim();
  const isAdmin = admins.includes(String(id));
  const user = await getUser(env, id, m.from);
  if (!user.lang) return askLang(env, id);                    // start-er por language select
  const lang = user.lang;
  if (text.startsWith('/start')) return home(env, id, lang, isAdmin);
  if (text.startsWith('/language')) return askLang(env, id);
  if (isAdmin && text.startsWith('/') && (await adminCmd(env, id, text))) return;
  if (text === ADMIN_BTN && isAdmin) return adminHome(env, id);
  const key = LABEL2KEY[text];
  if (key) {
    if (key === 'language') return askLang(env, id);
    if (key === 'settings') return settingsView(env, id, user);
    if (key === 'fear') return fgView(env, id, null, lang, 'today');
    if (key === 'prices') return pricesView(env, id, null, lang);
    if (key === 'calc') return send(env, id, I[lang].calcHelp);
    if (key === 'movers') return moversView(env, id, lang);
    return showNews(env, id, lang, key);
  }
  const c = text.match(CALC_RE);
  if (c) return calc(env, id, lang, c[1], c[2], c[3]);
}

export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('Inside Info bot OK');
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    try { await handle(await req.json(), env); } catch (e) { console.log(e.stack || e); }
    return new Response('ok');
  },
  // Cloudflare Cron Trigger: prottek 5 min-e GitHub workflow chalay
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const s = await getSettings(env);
        if (s.paused === '1') return;
        const r = await dispatch(env);
        if (r !== 'ok') console.log('dispatch:', r);
      } catch (e) { console.log(e.stack || e); }
    })());
  },
};
