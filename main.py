"""Inside Info - news fetcher + AI summarizer + Telegram pusher (runs on GitHub Actions)."""
import os, re, json, time, html, hashlib, datetime as dt
import requests, feedparser
from bs4 import BeautifulSoup

SB = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
KEY = os.environ["SUPABASE_KEY"]
BOT = os.environ["TELEGRAM_BOT_TOKEN"]
UA = {"User-Agent": "Mozilla/5.0 (compatible; InsideInfoBot/1.0)"}
LANGS = ["en", "bn", "hi", "ru", "zh"]
CATS = ["crypto", "finance", "world", "bd"]
S = {}

L = {"en": ("BREAKING", "Impact", "Source"), "bn": ("ব্রেকিং", "প্রভাব", "সোর্স"),
     "hi": ("ब्रेकिंग", "प्रभाव", "स्रोत"), "ru": ("СРОЧНО", "Влияние", "Источник"), "zh": ("突发", "影响", "来源")}
CN = {"en": ["Crypto", "Finance", "World", "Bangladesh"], "bn": ["ক্রিপ্টো", "ফাইন্যান্স", "বিশ্ব", "বাংলাদেশ"],
      "hi": ["क्रिप्टो", "फाइनेंस", "विश्व", "बांग्लादेश"], "ru": ["Крипто", "Финансы", "Мир", "Бангладеш"],
      "zh": ["加密货币", "金融", "国际", "孟加拉国"]}

PROMPT = """You are the news editor of "Inside Info". The user sends a JSON list of raw news items.
Return ONLY JSON: {"items":[{"i":<index>,"category":"crypto|finance|world|bd","score":<1-10>,"text":{"en":"","bn":"","hi":"","ru":"","zh":""}}]}
Rules:
- text = clear headline + at most one short context sentence, max 260 characters per language. Translate faithfully, keep tickers, names and numbers exact. Never invent facts.
- score = real impact: 9-10 breaking/major (hack, ETF decision, crash, war, central bank move, big whale move), 7-8 important, 5-6 normal, 1-4 minor/promotional.
- Ads, giveaways, referral links, price-chatter with no news => score 1-2.
- Bangladesh items: category "bd"; give a high score only for major national events.
- Respond with valid JSON only, no markdown."""


def db(method, path, **kw):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", **kw.pop("headers", {})}
    r = requests.request(method, f"{SB}/{path}", headers=h, timeout=30, **kw)
    r.raise_for_status()
    return r.json() if r.text else None


def clean(t):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(t or ""))).strip()


# ---------- fetchers ----------
def fetch_rss(s):
    r = requests.get(s["url"], headers=UA, timeout=20)
    for e in feedparser.parse(r.content).entries[:10]:
        yield {"title": clean(e.get("title"))[:300], "body": clean(e.get("summary"))[:400], "url": e.get("link")}


def fetch_tg(s):
    name = s["url"].rstrip("/").split("/")[-1]
    soup = BeautifulSoup(requests.get(f"https://t.me/s/{name}", headers=UA, timeout=20).text, "html.parser")
    for w in soup.select(".tgme_widget_message")[-10:]:
        txt, a = w.select_one(".tgme_widget_message_text"), w.select_one("a.tgme_widget_message_date")
        if txt and a and a.get("href"):
            yield {"title": txt.get_text(" ", strip=True)[:600], "body": "", "url": a["href"]}


def fetch_api(s):
    now = dt.datetime.utcnow()
    if "alternative.me" in s["url"]:
        d = requests.get(s["url"], timeout=20).json()["data"][0]
        yield {"title": f"Crypto Fear & Greed Index: {d['value']} ({d['value_classification']})", "body": "", "url": f"{s['url']}#{now:%Y%m%d}"}
    elif "coingecko" in s["url"]:
        coins = requests.get(s["url"], headers=UA, timeout=20).json()["coins"][:7]
        yield {"title": "CoinGecko trending coins: " + ", ".join(c["item"]["name"] for c in coins), "body": "",
               "url": f"{s['url']}#{now:%Y%m%d}{now.hour // 6}"}


def collect(sources):
    out = {}
    for s in sources:
        try:
            fn = {"rss": fetch_rss, "telegram": fetch_tg, "api": fetch_api}[s["type"]]
            for it in fn(s):
                if it.get("url") and it["title"]:
                    h = hashlib.sha1(it["url"].encode()).hexdigest()
                    out.setdefault(h, {**it, "source": s["name"], "hint": s["category"], "hash": h})
        except Exception as e:
            print("SOURCE ERROR", s["name"], e)
    return list(out.values())


def only_new(items):
    seen = set()
    for i in range(0, len(items), 50):
        hs = ",".join(x["hash"] for x in items[i:i + 50])
        seen |= {r["url_hash"] for r in db("GET", f"news?select=url_hash&url_hash=in.({hs})")}
    return [x for x in items if x["hash"] not in seen]


# ---------- AI ----------
def call_ai(provider, msg):
    if provider == "gemini":
        model = S.get("gemini_model", "gemini-2.5-flash")
        r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                          headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]}, timeout=120,
                          json={"systemInstruction": {"parts": [{"text": PROMPT}]}, "contents": [{"parts": [{"text": msg}]}],
                                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}})
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    model = S.get("groq_model", "llama-3.3-70b-versatile")
    r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                      headers={"Authorization": "Bearer " + os.environ["GROQ_API_KEY"]}, timeout=120,
                      json={"model": model, "temperature": 0.2, "response_format": {"type": "json_object"},
                            "messages": [{"role": "system", "content": PROMPT}, {"role": "user", "content": msg}]})
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def ai_batch(items):
    primary = S.get("ai_provider", "gemini")
    msg = json.dumps([{"i": i, "source": x["source"], "hint": x["hint"], "title": x["title"], "body": x["body"]}
                      for i, x in enumerate(items)], ensure_ascii=False)
    for p in [primary] + [q for q in ("gemini", "groq") if q != primary]:
        if not os.environ.get("GEMINI_API_KEY" if p == "gemini" else "GROQ_API_KEY"):
            continue
        try:
            return json.loads(call_ai(p, msg))["items"]
        except Exception as e:
            print("AI FAIL", p, e)
    return []


# ---------- Telegram ----------
def tg_send(chat, text):
    r = requests.post(f"https://api.telegram.org/bot{BOT}/sendMessage", timeout=20,
                      json={"chat_id": chat, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True})
    if r.status_code == 403:
        db("PATCH", f"users?chat_id=eq.{chat}", json={"blocked": True})
    elif r.status_code == 429:
        time.sleep(r.json().get("parameters", {}).get("retry_after", 3) + 1)
        return tg_send(chat, text)
    time.sleep(0.05)


def fmt(n, lang):
    b, imp, src = L[lang]
    s = n["score"]
    cat = CN[lang][CATS.index(n["category"])]
    icon = "🔴" if s >= 9 else "🟠" if s >= 7 else "🟢"
    head = f"{icon} <b>{b} | {cat}</b>" if s >= 9 else f"{icon} <b>{cat}</b>"
    body = html.escape(n["summaries"].get(lang) or n["summaries"]["en"])
    return f'{head}\n{body}\n📊 {imp}: {s}/10\n🔗 {src}: <a href="{html.escape(n["url"])}">{html.escape(n["source"])}</a>'


def active_users():
    return db("GET", "users?select=chat_id,lang,cats,min_score&blocked=eq.false&lang=not.is.null")


def push(rows):
    users, floor = active_users(), int(S.get("push_min_score", 5))
    for n in sorted(rows, key=lambda r: -r["score"]):
        if n["score"] >= floor:
            for u in users:
                if n["category"] in u["cats"] and n["score"] >= u["min_score"]:
                    tg_send(u["chat_id"], fmt(n, u["lang"]))
        db("PATCH", f"news?id=eq.{n['id']}", json={"sent": True})


def send_broadcasts():
    for b in db("GET", "broadcasts?select=*") or []:
        for u in active_users():
            tg_send(u["chat_id"], b["text"])
        db("DELETE", f"broadcasts?id=eq.{b['id']}")


# ---------- main ----------
def main():
    global S
    S = {r["key"]: r["value"] for r in db("GET", "settings?select=key,value")}
    send_broadcasts()
    if S.get("paused") == "1":
        return print("paused by admin")
    items = only_new(collect(db("GET", "sources?enabled=eq.true&select=*")))
    print("new items:", len(items))
    if not items:
        return
    if db("GET", "news?select=id&limit=1") == []:      # prothom run: shudhu baseline, push na
        rows = [{"url_hash": x["hash"], "url": x["url"], "source": x["source"], "title": x["title"][:300],
                 "category": x["hint"], "score": 0, "summaries": {"en": x["title"][:260]}, "sent": True} for x in items]
        for i in range(0, len(rows), 200):
            db("POST", "news", json=rows[i:i + 200], headers={"Prefer": "resolution=ignore-duplicates"})
        return print("baseline stored:", len(rows))
    items = items[:int(S.get("max_per_run", 32))]
    stored = []
    for i in range(0, len(items), 8):
        chunk = items[i:i + 8]
        rows = []
        for r in ai_batch(chunk):
            try:
                x, txt = chunk[int(r["i"])], r.get("text") or {}
                if not txt.get("en"):
                    continue
                cat = r.get("category") if r.get("category") in CATS else x["hint"]
                rows.append({"url_hash": x["hash"], "url": x["url"], "source": x["source"], "title": x["title"][:300],
                             "category": "bd" if x["hint"] == "bd" else cat,
                             "score": max(1, min(10, int(r.get("score", 5)))), "summaries": txt, "sent": False})
            except Exception as e:
                print("ROW ERROR", e)
        if rows:
            stored += db("POST", "news", json=rows, headers={"Prefer": "return=representation,resolution=ignore-duplicates"}) or []
        time.sleep(4)                                    # free rate limit-er jonno
    push([r for r in stored if not r["sent"]])
    cut = (dt.datetime.utcnow() - dt.timedelta(days=30)).isoformat()
    db("DELETE", f"news?created_at=lt.{cut}")           # 500MB limit-er moddhe thakar jonno


if __name__ == "__main__":
    main()
