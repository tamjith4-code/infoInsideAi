// Inside Info bot - Cloudflare Worker (Telegram webhook)
const CATS = ['crypto', 'finance', 'world', 'bd'];
const LANGS = { en: '🇬🇧 English', bn: '🇧🇩 বাংলা', hi: '🇮🇳 हिन्दी', ru: '🇷🇺 Русский', zh: '🇨🇳 中文' };
const I = {
  en: { welcome: "👋 Welcome to <b>Inside Info</b>!\nReal-time Crypto, Finance, World & Bangladesh news, summarized by AI.\nChoose a section 👇", latest: '📰 Latest', crypto: '🪙 Crypto', finance: '💹 Finance', world: '🌍 World', bd: '🇧🇩 Bangladesh', settings: '🔔 Alerts', language: '🌐 Language', noNews: 'No news yet.', settingsTitle: '🔔 <b>Alert settings</b>\nToggle sections & choose importance:', modeAll: 'All (5+)', modeImp: 'Important (7+)', modeBrk: 'Breaking only (9+)', impact: 'Impact', source: 'Source' },
  bn: { welcome: "👋 <b>Inside Info</b>-এ স্বাগতম!\nক্রিপ্টো, ফাইন্যান্স, বিশ্ব ও বাংলাদেশের খবর, AI সামারি সহ।\nনিচ থেকে সেকশন বেছে নিন 👇", latest: '📰 সর্বশেষ', crypto: '🪙 ক্রিপ্টো', finance: '💹 ফাইন্যান্স', world: '🌍 বিশ্ব', bd: '🇧🇩 বাংলাদেশ', settings: '🔔 অ্যালার্ট', language: '🌐 ভাষা', noNews: 'এখনো কোনো খবর নেই।', settingsTitle: '🔔 <b>অ্যালার্ট সেটিংস</b>\nসেকশন অন/অফ করুন ও গুরুত্ব বেছে নিন:', modeAll: 'সব (5+)', modeImp: 'গুরুত্বপূর্ণ (7+)', modeBrk: 'শুধু ব্রেকিং (9+)', impact: 'প্রভাব', source: 'সোর্স' },
  hi: { welcome: "👋 <b>Inside Info</b> में स्वागत है!\nक्रिप्टो, फाइनेंस, विश्व और बांग्लादेश की खबरें, AI सारांश के साथ।\nनीचे से सेक्शन चुनें 👇", latest: '📰 ताज़ा', crypto: '🪙 क्रिप्टो', finance: '💹 फाइनेंस', world: '🌍 विश्व', bd: '🇧🇩 बांग्लादेश', settings: '🔔 अलर्ट', language: '🌐 भाषा', noNews: 'अभी कोई खबर नहीं।', settingsTitle: '🔔 <b>अलर्ट सेटिंग्स</b>\nसेक्शन चालू/बंद करें और महत्व चुनें:', modeAll: 'सभी (5+)', modeImp: 'महत्वपूर्ण (7+)', modeBrk: 'सिर्फ़ ब्रेकिंग (9+)', impact: 'प्रभाव', source: 'स्रोत' },
  ru: { welcome: "👋 Добро пожаловать в <b>Inside Info</b>!\nКрипто, финансы, мир и Бангладеш: новости с AI-сводкой.\nВыберите раздел 👇", latest: '📰 Последние', crypto: '🪙 Крипто', finance: '💹 Финансы', world: '🌍 Мир', bd: '🇧🇩 Бангладеш', settings: '🔔 Уведомления', language: '🌐 Язык', noNews: 'Новостей пока нет.', settingsTitle: '🔔 <b>Настройки уведомлений</b>\nВключайте разделы и выберите важность:', modeAll: 'Все (5+)', modeImp: 'Важные (7+)', modeBrk: 'Только срочные (9+)', impact: 'Влияние', source: 'Источник' },
  zh: { welcome: "👋 欢迎使用 <b>Inside Info</b>！\n加密货币、金融、国际和孟加拉国新闻，AI 智能摘要。\n请选择栏目 👇", latest: '📰 最新', crypto: '🪙 加密货币', finance: '💹 金融', world: '🌍 国际', bd: '🇧🇩 孟加拉国', settings: '🔔 提醒', language: '🌐 语言', noNews: '暂无新闻。', settingsTitle: '🔔 <b>提醒设置</b>\n开关栏目并选择重要程度：', modeAll: '全部 (5+)', modeImp: '重要 (7+)', modeBrk: '仅突发 (9+)', impact: '影响', source: '来源' },
};
const MENU = ['latest', 'crypto', 'finance', 'world', 'bd', 'settings', 'language'];
const ADMIN_BTN = '⚙️ Admin';
const LABEL2KEY = {};
for (const l in I) for (const k of MENU) LABEL2KEY[I[l][k]] = k;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icon = (s) => (s >= 9 ? '🔴' : s >= 7 ? '🟠' : '🟢');

const tg = (env, m, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const send = (env, chat, text, extra = {}) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const show = (env, chat, mid, text, kb) => {
  const body = { chat_id: chat, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } };
  return mid ? tg(env, 'editMessageText', { ...body, message_id: mid }) : tg(env, 'sendMessage', body);
};
const sb = (env, path, opt = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...opt, headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const sbj = async (env, path, opt) => { const r = await sb(env, path, opt); const t = await r.text(); return t ? JSON.parse(t) : null; };
const count = async (env, path) => { const r = await sb(env, path + '&limit=1', { headers: { Prefer: 'count=exact' } }); return (r.headers.get('content-range') || '/0').split('/')[1]; };
const getSettings = async (env) => Object.fromEntries((await sbj(env, 'settings?select=key,value')).map((r) => [r.key, r.value]));
const setSetting = (env, key, value) => sb(env, 'settings', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key, value: String(value) }) });
const patchUser = (env, id, data) => sb(env, `users?chat_id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) });

async function getUser(env, id) {
  const r = await sbj(env, `users?chat_id=eq.${id}&select=*`);
  if (r && r.length) return r[0];
  const c = await sbj(env, 'users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ chat_id: id }) });
  return c[0];
}

const menuKb = (lang, isAdmin) => {
  const t = I[lang];
  const rows = [[t.latest, t.crypto], [t.finance, t.world], [t.bd, t.settings], [t.language]];
  if (isAdmin) rows[3].push(ADMIN_BTN);
  return { keyboard: rows.map((r) => r.map((text) => ({ text }))), resize_keyboard: true };
};
const langKb = () => ({ inline_keyboard: Object.entries(LANGS).map(([k, v]) => [{ text: v, callback_data: `lang:${k}` }]) });
const askLang = (env, id) => send(env, id, '🌐 Choose your language / ভাষা বেছে নিন', { reply_markup: langKb() });
const home = (env, id, lang, isAdmin) => send(env, id, I[lang].welcome, { reply_markup: menuKb(lang, isAdmin) });

async function showNews(env, id, lang, cat) {
  const t = I[lang];
  let q = 'news?select=summaries,score,source,url,category&score=gte.5&order=created_at.desc&limit=5';
  if (cat !== 'latest') q += `&category=eq.${cat}`;
  const rows = await sbj(env, q);
  if (!rows || !rows.length) return send(env, id, t.noNews);
  const text = rows.map((n) => `${icon(n.score)} ${esc(n.summaries[lang] || n.summaries.en)}\n📊 ${t.impact}: ${n.score}/10 · <a href="${esc(n.url)}">${esc(n.source)}</a>`).join('\n\n');
  return send(env, id, text.slice(0, 4000));
}

function settingsView(env, id, user, mid) {
  const t = I[user.lang || 'en'];
  const kb = CATS.map((c) => [{ text: `${user.cats.includes(c) ? '✅' : '❌'} ${t[c]}`, callback_data: `cat:${c}` }]);
  for (const [n, l] of [[5, t.modeAll], [7, t.modeImp], [9, t.modeBrk]]) kb.push([{ text: `${user.min_score === n ? '🔘' : '⚪'} ${l}`, callback_data: `mode:${n}` }]);
  return show(env, id, mid, t.settingsTitle, kb);
}

// ---------------- ADMIN ----------------
const back = [{ text: '⬅️ Admin', callback_data: 'ad:home' }];
async function adminHome(env, id, mid) {
  const s = await getSettings(env);
  const kb = [
    [{ text: '📊 Stats', callback_data: 'ad:stats' }, { text: '🤖 AI Provider', callback_data: 'ad:ai' }],
    [{ text: '📡 Sources', callback_data: 'ad:src' }, { text: s.paused === '1' ? '▶️ Resume fetching' : '⏸ Pause fetching', callback_data: 'ad:pause' }],
    [{ text: `🔔 Global min score: ${s.push_min_score || 5}`, callback_data: 'ad:min' }],
  ];
  const help = '⚙️ <b>Admin Panel</b>\n\nCommands:\n/addsource type|name|category|url\n  (type: rss/telegram/api, category: crypto/finance/world/bd)\n/delsource ID\n/setmodel gemini MODEL\n/setmodel groq MODEL\n/broadcast message';
  return show(env, id, mid, help, kb);
}
async function srcView(env, id, mid) {
  const rows = await sbj(env, 'sources?select=id,name,category,enabled&order=id');
  const kb = rows.map((r) => [{ text: `${r.enabled ? '✅' : '⏸'} #${r.id} ${r.name} (${r.category})`, callback_data: `ad:st:${r.id}` }]);
  kb.push(back);
  return show(env, id, mid, '📡 <b>Sources</b> (tap to enable/disable)', kb);
}
async function aiView(env, id, mid) {
  const s = await getSettings(env);
  const p = s.ai_provider || 'gemini';
  const kb = [[{ text: `${p === 'gemini' ? '✅' : '⚪'} Gemini`, callback_data: 'ad:setai:gemini' }, { text: `${p === 'groq' ? '✅' : '⚪'} Groq`, callback_data: 'ad:setai:groq' }], back];
  return show(env, id, mid, `🤖 <b>AI provider:</b> ${p}\nGemini model: <code>${esc(s.gemini_model)}</code>\nGroq model: <code>${esc(s.groq_model)}</code>\n\nModel change: /setmodel gemini MODEL_NAME\nPrimary fail hole onno provider auto fallback hobe.`, kb);
}
async function adminCmd(env, id, text) {
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ');
  if (cmd === '/admin') { await adminHome(env, id); return true; }
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
    if (!['gemini', 'groq'].includes(p) || !model) { await send(env, id, 'Usage: /setmodel gemini gemini-2.5-flash'); return true; }
    await setSetting(env, `${p}_model`, model); await send(env, id, `✅ ${p} model = ${esc(model)}`); return true;
  }
  if (cmd === '/broadcast') {
    if (!arg) { await send(env, id, 'Usage: /broadcast your message'); return true; }
    await sb(env, 'broadcasts', { method: 'POST', body: JSON.stringify({ text: arg }) });
    await send(env, id, '📢 Queued. Next fetch run (≤10 min)-e sobar kache jabe.'); return true;
  }
  return false;
}
async function adminCb(env, id, mid, d) {
  if (d === 'ad:home') return adminHome(env, id, mid);
  if (d === 'ad:stats') {
    const [u, a, n, n24] = await Promise.all([count(env, 'users?select=chat_id'), count(env, 'users?select=chat_id&blocked=eq.false&lang=not.is.null'), count(env, 'news?select=id&score=gte.5'), count(env, `news?select=id&created_at=gte.${new Date(Date.now() - 864e5).toISOString()}`)]);
    return show(env, id, mid, `📊 <b>Stats</b>\nUsers: ${u}\nActive: ${a}\nNews (score 5+): ${n}\nLast 24h: ${n24}`, [back]);
  }
  if (d === 'ad:ai') return aiView(env, id, mid);
  if (d.startsWith('ad:setai:')) { await setSetting(env, 'ai_provider', d.split(':')[2]); return aiView(env, id, mid); }
  if (d === 'ad:src') return srcView(env, id, mid);
  if (d.startsWith('ad:st:')) {
    const sid = d.split(':')[2];
    const [r] = await sbj(env, `sources?id=eq.${sid}&select=enabled`);
    await sb(env, `sources?id=eq.${sid}`, { method: 'PATCH', body: JSON.stringify({ enabled: !r.enabled }) });
    return srcView(env, id, mid);
  }
  if (d === 'ad:pause') { const s = await getSettings(env); await setSetting(env, 'paused', s.paused === '1' ? '0' : '1'); return adminHome(env, id, mid); }
  if (d === 'ad:min') { const s = await getSettings(env); const cur = parseInt(s.push_min_score || 5); await setSetting(env, 'push_min_score', cur >= 9 ? 5 : cur + 2); return adminHome(env, id, mid); }
}

// ---------------- ROUTER ----------------
async function onCb(q, env, admins) {
  const id = q.message.chat.id, mid = q.message.message_id, d = q.data;
  const isAdmin = admins.includes(String(id));
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
  const user = await getUser(env, id);
  if (d.startsWith('lang:')) {
    const lang = d.slice(5);
    if (!I[lang]) return;
    await patchUser(env, id, { lang });
    await tg(env, 'deleteMessage', { chat_id: id, message_id: mid });
    return home(env, id, lang, isAdmin);
  }
  if (d.startsWith('cat:')) {
    const c = d.slice(4);
    user.cats = user.cats.includes(c) ? user.cats.filter((x) => x !== c) : [...user.cats, c];
    await patchUser(env, id, { cats: user.cats });
    return settingsView(env, id, user, mid);
  }
  if (d.startsWith('mode:')) { user.min_score = parseInt(d.slice(5)); await patchUser(env, id, { min_score: user.min_score }); return settingsView(env, id, user, mid); }
  if (isAdmin && d.startsWith('ad:')) return adminCb(env, id, mid, d);
}

async function handle(u, env) {
  const admins = (env.ADMIN_IDS || '').split(',').map((s) => s.trim());
  if (u.callback_query) return onCb(u.callback_query, env, admins);
  const m = u.message;
  if (!m || !m.text) return;
  const id = m.chat.id, text = m.text.trim();
  const isAdmin = admins.includes(String(id));
  const user = await getUser(env, id);
  if (!user.lang) return askLang(env, id);                    // start-er por language select
  if (text.startsWith('/start')) return home(env, id, user.lang, isAdmin);
  if (text.startsWith('/language')) return askLang(env, id);
  if (isAdmin && text.startsWith('/') && (await adminCmd(env, id, text))) return;
  if (text === ADMIN_BTN && isAdmin) return adminHome(env, id);
  const key = LABEL2KEY[text];
  if (!key) return;
  if (key === 'language') return askLang(env, id);
  if (key === 'settings') return settingsView(env, id, user);
  return showNews(env, id, user.lang, key);
}

export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('Inside Info bot OK');
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    try { await handle(await req.json(), env); } catch (e) { console.log(e.stack || e); }
    return new Response('ok');
  },
};
