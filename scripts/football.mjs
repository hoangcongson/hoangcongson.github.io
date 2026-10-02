const API = 'https://api-v2.chuoichientv.com/v2/matches?page=1&limit=100&sport=football&type=blv';

const isUrl = v => typeof v === 'string' && /^https?:\/\//i.test(v);
const isStream = v =>
  isUrl(v) &&
  /(?:\.m3u8?(?:[?#]|$)|\.ts(?:[?#]|$)|\/live\/|stream|playlist|\.mpd(?:[?#]|$))/i.test(v);

function walk(node, context = {}, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (Array.isArray(node)) {
    for (const x of node) walk(x, context, out);
    return out;
  }

  const ctx = { ...context };

  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') {
      const key = k.toLowerCase();

      if (/home.*name|home.*team|team.*home/.test(key)) ctx.home = v;
      if (/away.*name|away.*team|team.*away/.test(key)) ctx.away = v;

      if (/match.*name|title|name/.test(key) && v.length < 180) {
        ctx.title = v;
      }

      if (isStream(v)) {
        out.push({
          url: v,
          title:
            ctx.title ||
            [ctx.home, ctx.away].filter(Boolean).join(' vs ') ||
            'Football LIVE'
        });
      }
    } else if (v && typeof v === 'object') {
      walk(v, ctx, out);
    }
  }

  return out;
}

const res = await fetch(API);

if (!res.ok) {
  throw new Error(`API HTTP ${res.status}`);
}

const data = await res.json();

let items = walk(data);
const seen = new Set();

items = items.filter(item => {
  if (seen.has(item.url)) return false;
  seen.add(item.url);
  return true;
});

const esc = s => String(s).replace(/[,\\r\\n]/g, ' ').trim();

let m3u = '#EXTM3U\\n';

for (const item of items) {
  m3u +=
    '#EXTINF:-1 group-title="⚽ BÓNG ĐÁ",' +
    esc(item.title) +
    '\\n' +
    item.url +
    '\\n';
}

process.stdout.write(m3u);
