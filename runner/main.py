"""Inside Info v2 - fetch -> AI analyze -> translate -> push (runs on GitHub Actions)."""
import os, re, json, time, html, hashlib, datetime as dt
import requests, feedparser
from bs4 import BeautifulSoup

SB = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
KEY = os.environ["SUPABASE_KEY"]
BOT = os.environ["TELEGRAM_BOT_TOKEN"]
UA = {"User-Agent": "Mozilla/5.0 (compatible; InsideInfoBot/2.0)"}
UTC = dt.timezone.utc
CATS = ["crypto", "finance", "world", "bd"]
VISIBLE = 5                      # score 5+ menu-te dekhay
START = time.time()
S = {}

L = {"en": ("BREAKING", "Impact"), "bn": ("ব্রেকিং", "প্রভাব"), "hi": ("ब्रेकिंग", "प्रभाव"),
     "ru": ("СРОЧНО", "Влияние"), "zh": ("突发", "影响")}
CN = {"en": ["Crypto", "Finance", "World", "Bangladesh"], "bn": ["ক্রিপ্টো", "ফাইন্যান্স", "বিশ্ব", "বাংলাদেশ"],
      "hi": ["क्रिप्टो", "फाइनेंस", "विश्व", "बांग्लादेश"], "ru": ["Крипто", "Финансы", "Мир", "Бангладеш"],
      "zh": ["加密货币", "金融", "国际", "孟加拉国"]}

PROMPT_A = """You are the news editor of "Inside Info". Input: a JSON list of raw items {"i","src","hint","text"}.
Return ONLY valid JSON: {"items":[{"i":<index>,"category":"crypto|finance|world|bd","score":<1-10>,"en":"<English news text>"}]}
Rules:
- en = a clear headline plus at most one short sentence of context, max 240 characters. Rewrite in your own words, keep tickers, names and numbers exact, never invent facts.
- category: crypto = crypto, blockchain, DeFi, whales, exchanges; finance = stocks, rates, inflation, central banks, commodities, forex; world = global politics, wars, major world events, big tech and AI industry news; bd = anything about Bangladesh.
- score = real impact: 9-10 breaking/major (hack, ETF decision, market crash, war, central-bank move, huge whale move), 7-8 important, 5-6 normal news, 1-4 minor, promotional or opinion.
- Ads, giveaways, referral links, empty price chatter => score 1-2.
- If several items report the same event, keep the best one with its real score and give the others score 1.
- Bangladesh items (category bd): score them on the normal scale (routine national news 5-6, important 7-8, breaking national events 9-10). Only trivial gossip, sports chatter or ads get 1-4.
- Output every input index exactly once. JSON only, no markdown."""

PROMPT_T = """You are a professional news translator. Input: {"langs":[codes],"items":[{"i","en"}]}.
Return ONLY valid JSON: {"items":[{"i":<index>,"<code>":"<translation>", ...one key per requested code}]}.
Codes: bn=Bengali, hi=Hindi, ru=Russian, zh=Simplified Chinese. Natural journalistic tone, faithful meaning,
keep tickers, coin names, numbers and proper names. Max 260 characters per translation. JSON only, no markdown."""


# ---------------- helpers ----------------
def db(method, path, **kw):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", **kw.pop("headers", {})}
    r = requests.request(method, f"{SB}/{path}", headers=h, timeout=30, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"supabase {r.status_code}: {r.text[:300]}")
    return r.json() if r.text else None


def clean(t):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(t or ""))).strip()


def iso(v):
    try:
        d = dt.datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return (d if d.tzinfo else d.replace(tzinfo=UTC)).astimezone(UTC).isoformat()
    except Exception:
        return None


def age_h(x):
    if not x.get("published"):
        return 0
    try:
        return (dt.datetime.now(UTC) - dt.datetime.fromisoformat(x["published"])).total_seconds() / 3600
    except Exception:
        return 0


TZ = {"en": (0, "UTC"), "bn": (360, "GMT+6"), "hi": (330, "GMT+5:30"), "ru": (180, "GMT+3"), "zh": (480, "GMT+8")}


def fmt_dt(v, lang):
    """News-er exact somoy, user-er language onujayi timezone-e (bn=GMT+6)."""
    try:
        d = dt.datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        off, label = TZ.get(lang, TZ["en"])
        return (d.astimezone(UTC) + dt.timedelta(minutes=off)).strftime("%d.%m.%Y %H:%M") + " " + label
    except Exception:
        return ""


def parse_json(text):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(text[text.find("{"): text.rfind("}") + 1])


# ---------------- fetchers ----------------
def fetch_rss(s):
    r = requests.get(s["url"], headers=UA, timeout=20)
    for e in feedparser.parse(r.content).entries[:12]:
        t = e.get("published_parsed") or e.get("updated_parsed")
        pub = dt.datetime(*t[:6], tzinfo=UTC).isoformat() if t else None
        yield {"title": clean(e.get("title"))[:300], "body": clean(e.get("summary"))[:400], "url": e.get("link"), "published": pub}


def fetch_tg(s):
    name = s["url"].rstrip("/").split("/")[-1]
    soup = BeautifulSoup(requests.get(f"https://t.me/s/{name}", headers=UA, timeout=20).text, "html.parser")
    for w in soup.select(".tgme_widget_message")[-8:]:
        txt, a = w.select_one(".tgme_widget_message_text"), w.select_one("a.tgme_widget_message_date")
        if not (txt and a and a.get("href")):
            continue
        t = a.select_one("time")
        pub = iso(t.get("datetime")) if t and t.get("datetime") else None
        for br in txt.find_all("br"):
            br.replace_with("\n")
        text = re.sub(r"[ \t]+", " ", txt.get_text()).strip()
        blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if len(b.strip()) > 30]
        if len(text) > 500 and len(blocks) >= 3:          # daily brief (jemon aixbt): prottek khobor alada item
            for b in blocks[:15]:
                one = re.sub(r"\s+", " ", b.replace("\n", " — ", 1))[:500]
                yield {"title": one, "body": "", "url": a["href"], "published": pub,
                       "hash": hashlib.sha1(("blk:" + one.lower()).encode()).hexdigest()}
        else:
            yield {"title": re.sub(r"\s+", " ", text)[:600], "body": "", "url": a["href"], "published": pub}


def fetch_api(s):
    now = dt.datetime.now(UTC)
    if "alternative.me" in s["url"]:
        d = requests.get(s["url"], timeout=20).json()["data"][0]
        yield {"title": f"Crypto Fear & Greed Index: {d['value']} ({d['value_classification']})", "body": "",
               "url": f"{s['url']}#{now:%Y%m%d}",
               "published": dt.datetime.fromtimestamp(int(d["timestamp"]), UTC).isoformat()}
    elif "coingecko" in s["url"]:
        coins = requests.get(s["url"], headers=UA, timeout=20).json()["coins"][:7]
        yield {"title": "CoinGecko trending coins: " + ", ".join(c["item"]["name"] for c in coins), "body": "",
               "url": f"{s['url']}#{now:%Y%m%d}{now.hour // 6}", "published": None}


FETCH = {"rss": fetch_rss, "telegram": fetch_tg, "api": fetch_api}


def collect(sources):
    out = {}
    for s in sources:
        n = 0
        try:
            for it in FETCH[s["type"]](s):
                if it.get("url") and it["title"]:
                    h = it.get("hash") or hashlib.sha1(it["url"].encode()).hexdigest()
                    if h not in out:
                        out[h] = {**it, "source": s["name"], "hint": s["category"], "hash": h}
                        n += 1
            status = str(n)
        except Exception as e:
            print("SOURCE ERROR", s["name"], e)
            status = "ERR"
        print(f"  {s['name']}: {status}")
        try:
            db("PATCH", f"sources?id=eq.{s['id']}", json={"last_status": status})
        except Exception:
            pass
    return list(out.values())


def only_new(items):
    seen = set()
    for i in range(0, len(items), 50):
        hs = ",".join(x["hash"] for x in items[i:i + 50])
        seen |= {r["url_hash"] for r in db("GET", f"news?select=url_hash&url_hash=in.({hs})")}
    return [x for x in items if x["hash"] not in seen]


def interleave(items):
    """Source-gulo ghuriye ghuriye nao, jate Bangladesh/world-er source-o ekdom shuru theke jayga pay."""
    groups = {}
    for x in sorted(items, key=lambda x: x.get("published") or "", reverse=True):
        groups.setdefault(x["source"], []).append(x)
    lists, out = list(groups.values()), []
    while any(lists):
        for lst in lists:
            if lst:
                out.append(lst.pop(0))
    return out


def baseline(items):
    rows = [{"url_hash": x["hash"], "url": x["url"], "source": x["source"], "title": x["title"][:300], "category": x["hint"],
             "score": 0, "summaries": {"en": x["title"][:260]}, "published_at": x.get("published"), "sent": True} for x in items]
    for i in range(0, len(rows), 200):
        db("POST", "news", json=rows[i:i + 200], headers={"Prefer": "resolution=ignore-duplicates"})


# ---------------- AI ----------------
def post(url, **kw):
    for attempt in (1, 2):
        r = requests.post(url, timeout=150, **kw)
        if r.status_code == 429 and attempt == 1:
            try:
                wait = float(r.headers.get("retry-after") or 20)
            except ValueError:
                wait = 20
            time.sleep(min(wait, 60))
            continue
        break
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code} {r.text[:300]}")
    return r


def save_setting(key, value):
    try:
        db("POST", "settings", json={"key": key, "value": str(value)}, headers={"Prefer": "resolution=merge-duplicates"})
    except Exception as e:
        print("save_setting failed", e)


def gemini_call(model, system, msg):
    r = post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
             headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
             json={"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"parts": [{"text": msg}]}],
                   "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}})
    parts = r.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts if not p.get("thought"))


def gemini_discover():
    """Model-er naam 404 dile Google-er list theke ekta chalu flash model khuje ber kore."""
    r = requests.get("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
                     headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]}, timeout=30)
    r.raise_for_status()
    names = [m["name"].split("/")[-1] for m in r.json().get("models", [])
             if "generateContent" in m.get("supportedGenerationMethods", [])]
    if "gemini-flash-latest" in names:
        return "gemini-flash-latest"
    bad = ("lite", "image", "tts", "live", "audio", "thinking", "exp", "embedding")
    cand = [n for n in names if "flash" in n and not any(b in n for b in bad)]
    ver = lambda n: [float(v) for v in re.findall(r"\d+\.?\d*", n)]
    return max(cand, key=ver) if cand else None


def call_ai(provider, system, msg):
    if provider == "gemini":
        model = S.get("gemini_model") or "gemini-flash-latest"
        try:
            return gemini_call(model, system, msg)
        except RuntimeError as e:
            if str(e).startswith("404"):
                new = gemini_discover()
                if new and new != model:
                    print("gemini model switched:", model, "->", new)
                    S["gemini_model"] = new
                    save_setting("gemini_model", new)
                    return gemini_call(new, system, msg)
            raise
    model = S.get("groq_model") or "openai/gpt-oss-120b"
    body = {"model": model, "temperature": 0.2, "max_completion_tokens": 8192,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": msg}]}
    if "gpt-oss" in model:
        body["reasoning_effort"] = "low"
    r = post("https://api.groq.com/openai/v1/chat/completions",
             headers={"Authorization": "Bearer " + os.environ["GROQ_API_KEY"]}, json=body)
    return r.json()["choices"][0]["message"]["content"]


def ai_json(system, msg):
    primary = S.get("ai_provider", "gemini")
    for p in [primary] + [q for q in ("gemini", "groq") if q != primary]:
        if not os.environ.get("GEMINI_API_KEY" if p == "gemini" else "GROQ_API_KEY"):
            continue
        try:
            return parse_json(call_ai(p, system, msg))
        except Exception as e:
            print("AI FAIL", p, str(e)[:400])
    return None


def analyze(items):
    out = []
    for i in range(0, len(items), 12):
        if time.time() - START > 480:
            print("time budget reached, rest next run")
            break
        chunk = items[i:i + 12]
        msg = json.dumps([{"i": k, "src": x["source"], "hint": x["hint"],
                           "text": (x["title"] + (" — " + x["body"] if x["body"] else ""))[:700]}
                          for k, x in enumerate(chunk)], ensure_ascii=False)
        data = ai_json(PROMPT_A, msg)
        if not data:
            print("analysis failed for a chunk, retry next run")
            continue
        for r in data.get("items", []):
            try:
                x = chunk[int(r["i"])]
                en = clean(str(r.get("en", "")))[:280]
                if not en:
                    continue
                cat = r.get("category") if r.get("category") in CATS else x["hint"]
                if x["hint"] == "bd":
                    cat = "bd"
                out.append({"x": x, "category": cat, "score": max(1, min(10, int(r.get("score", 5)))), "en": en})
            except Exception as e:
                print("ROW ERROR", e)
    return out


def translate(rows, langs):
    todo = [r for r in rows if r["score"] >= VISIBLE]
    for i in range(0, len(todo), 8):
        if time.time() - START > 540:
            break
        chunk = todo[i:i + 8]
        msg = json.dumps({"langs": langs, "items": [{"i": k, "en": r["en"]} for k, r in enumerate(chunk)]}, ensure_ascii=False)
        data = ai_json(PROMPT_T, msg)
        if not data:
            continue
        for t in data.get("items", []):
            try:
                r = chunk[int(t["i"])]
                for lg in langs:
                    if t.get(lg):
                        r.setdefault("tr", {})[lg] = clean(str(t[lg]))[:300]
            except Exception:
                pass


# ---------------- Telegram ----------------
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
    brk, imp = L[lang]
    s = n["score"]
    cat = CN[lang][CATS.index(n["category"])]
    icon = "🔴" if s >= 9 else "🟠" if s >= 7 else "🟢"
    head = f"{icon} <b>{brk} | {cat}</b>" if s >= 9 else f"{icon} <b>{cat}</b>"
    body = html.escape(n["summaries"].get(lang) or n["summaries"]["en"])
    when = fmt_dt(n.get("published_at"), lang)          # shudhu source-er somoy; na thakle kichu dekhabe na
    return f"{head}\n{body}\n📊 {imp}: {s}/10" + (f" · {when}" if when else "")


def active_users():
    return db("GET", "users?select=chat_id,lang,cats,min_score&blocked=eq.false&lang=not.is.null") or []


def push(rows, users):
    if not rows:
        return
    rows.sort(key=lambda n: n.get("published_at") or "", reverse=True)
    rows.sort(key=lambda n: -n["score"])
    limit = int(S.get("max_push_per_run", 12))
    for n in rows[:limit]:
        for u in users:
            if n["category"] in u["cats"] and n["score"] >= u["min_score"]:
                tg_send(u["chat_id"], fmt(n, u["lang"]))
    db("PATCH", f"news?id=in.({','.join(str(n['id']) for n in rows)})", json={"sent": True})
    print("pushed:", min(len(rows), limit))


def send_broadcasts():
    for b in db("GET", "broadcasts?select=*") or []:
        for u in active_users():
            tg_send(u["chat_id"], b["text"])
        db("DELETE", f"broadcasts?id=eq.{b['id']}")


# ---------------- market cache (Worker-er calculator/movers fallback) ----------------
def refresh_market():
    try:
        lst = None
        r = requests.get("https://api.coingecko.com/api/v3/coins/markets", headers=UA, timeout=20,
                         params={"vs_currency": "usd", "order": "market_cap_desc", "per_page": 100, "page": 1, "sparkline": "false"})
        if r.status_code == 200:
            lst = [{"s": str(x["symbol"]).upper(), "p": x["current_price"], "c": x.get("price_change_percentage_24h"),
                    "v": x.get("total_volume")} for x in r.json()]
        if not lst:
            r = requests.get("https://min-api.cryptocompare.com/data/top/mktcapfull", headers=UA, timeout=20,
                             params={"limit": 100, "tsym": "USD"})
            if r.status_code == 200:
                lst = [{"s": str(d["CoinInfo"]["Name"]).upper(), "p": d["RAW"]["USD"]["PRICE"],
                        "c": d["RAW"]["USD"].get("CHANGEPCT24HOUR"), "v": d["RAW"]["USD"].get("TOTALVOLUME24HTO")}
                       for d in r.json().get("Data", []) if d.get("RAW", {}).get("USD")]
        if lst:
            db("POST", "market_cache", json={"key": "top100", "value": lst, "updated_at": dt.datetime.now(UTC).isoformat()},
               headers={"Prefer": "resolution=merge-duplicates"})
            print("market cache refreshed:", len(lst))
        else:
            print("market cache: no source worked")
    except Exception as e:
        print("market cache failed:", str(e)[:200])


def _kraken(path, **params):
    r = requests.get(f"https://api.kraken.com/0/public/{path}", params=params, headers=UA, timeout=20)
    r.raise_for_status()
    j = r.json()
    if j.get("error"):
        raise RuntimeError(str(j["error"])[:100])
    return j["result"]


def kraken_stats(pair):
    now = int(time.time())
    d = dt.datetime.now(UTC)
    this_m = int(dt.datetime(d.year, d.month, 1, tzinfo=UTC).timestamp())
    py, pm = (d.year, d.month - 1) if d.month > 1 else (d.year - 1, 12)
    prev_m = int(dt.datetime(py, pm, 1, tzinfo=UTC).timestamp())
    T = list(_kraken("Ticker", pair=pair).values())[0]
    time.sleep(1)

    def rows(interval, since):
        res = _kraken("OHLC", pair=pair, interval=interval, since=since)
        key = next(k for k in res if k != "last")
        time.sleep(1)
        return [{"t": x[0], "o": float(x[1]), "c": float(x[4]), "w": float(x[5]) or float(x[4]), "v": float(x[6])} for x in res[key]]

    m5, h1, d1 = rows(5, now - 6 * 3600 - 600), rows(60, now - 7 * 86400 - 3600), rows(1440, prev_m - 86400)
    sm = lambda a: {"q": sum(x["v"] * x["w"] for x in a), "b": sum(x["v"] for x in a)}
    chg = lambda a, n: (a[-n:][-1]["c"] / a[-n:][0]["o"] - 1) * 100
    nz = lambda o: o if o["b"] > 0 else None
    return {"src": "Kraken", "quote": "USD", "last": float(T["c"][0]), "high": float(T["h"][1]), "low": float(T["l"][1]),
            "c1h": chg(m5, 12), "c6h": chg(m5, 72), "c24h": chg(h1, 24), "c7d": chg(h1, 168), "c30d": chg(d1, 30),
            "v1h": sm(m5[-12:]), "v6h": sm(m5[-72:]), "v24h": {"b": float(T["v"][1]), "q": float(T["v"][1]) * float(T["p"][1])},
            "v7d": sm(h1[-168:]), "v30d": sm(d1[-30:]),
            "vm": nz(sm([x for x in d1 if this_m <= x["t"]])), "vlm": nz(sm([x for x in d1 if prev_m <= x["t"] < this_m]))}


def refresh_stats():
    try:
        out = {"btc": kraken_stats("XBTUSD"), "eth": kraken_stats("ETHUSD")}
        db("POST", "market_cache", json={"key": "stats", "value": out, "updated_at": dt.datetime.now(UTC).isoformat()},
           headers={"Prefer": "resolution=merge-duplicates"})
        print("stats cache refreshed")
    except Exception as e:
        print("stats cache failed:", str(e)[:200])


# ---------------- main ----------------
def main():
    global S
    S = {r["key"]: r["value"] for r in db("GET", "settings?select=key,value")}
    send_broadcasts()
    if S.get("paused") == "1":
        return print("paused by admin")
    refresh_market()
    refresh_stats()
    items = only_new(collect(db("GET", "sources?enabled=eq.true&select=*&order=id")))
    print("new items:", len(items))
    if not items:
        return
    if db("GET", "news?select=id&limit=1") == []:                 # prothom run: shudhu baseline
        baseline(items)
        return print("baseline stored:", len(items))

    ai_age = float(S.get("ai_max_age_hours", 48))
    fresh = [x for x in items if age_h(x) <= ai_age]
    fresh_hashes = {x["hash"] for x in fresh}
    stale = [x for x in items if x["hash"] not in fresh_hashes]
    if stale:
        baseline(stale)
        print("old items skipped (no AI):", len(stale))
    fresh = interleave(fresh)[:int(S.get("max_per_run", 60))]

    users = active_users()
    langs = sorted({u["lang"] for u in users} - {"en"})
    analyzed = analyze(fresh)
    if analyzed and langs:
        translate(analyzed, langs)

    floor, push_age = int(S.get("push_min_score", 5)), float(S.get("push_max_age_hours", 4))
    rows = []
    for r in analyzed:
        x = r["x"]
        can_push = r["score"] >= floor and age_h(x) <= push_age
        rows.append({"url_hash": x["hash"], "url": x["url"], "source": x["source"], "title": x["title"][:300],
                     "category": r["category"], "score": r["score"], "summaries": {"en": r["en"], **r.get("tr", {})},
                     "published_at": x.get("published"), "sent": not can_push})
    stored = []
    if rows:
        stored = db("POST", "news", json=rows, headers={"Prefer": "return=representation,resolution=ignore-duplicates"}) or []
    print(f"analyzed: {len(analyzed)}, stored: {len(stored)}")
    push([r for r in stored if not r["sent"]], users)

    cut = (dt.datetime.now(UTC) - dt.timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")   # "+" chinh URL-e bhenge jay, tai Z
    db("DELETE", f"news?created_at=lt.{cut}")                    # 500MB limit-er moddhe thakar jonno


if __name__ == "__main__":
    main()
