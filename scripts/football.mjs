const APIS = [
  'https://api-v2.chuoichientv.com/v2/matches?page=1&limit=100&sport=football&type=blv',
  'https://api.chuoichientv.com/v1/matches?page=1&limit=100&sport=football&type=blv'
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': 'https://chuoichientv.com',
  'Referer': 'https://chuoichientv.com/'
};

const isUrl = v =>
  typeof v === 'string' && /^https?:\/\//i.test(v);

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

      if (/home.*name|home.*team|team.*home/.test(key))
        ctx.home = v;

      if (/away.*name|away.*team|team.*away/.test(key))
        ctx.away = v;

      if (/match.*name|title|name/.test(key) && v.length < 180)
        ctx.title = v;

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

let data = null;
let lastError = null;

for (const api of APIS) {
  try {
    console.log(`Trying API: ${api}`);

    const res = await fetch(api, {
      headers: HEADERS
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    data = await res.json();
    console.error(`API OK: ${api}`);
    break;
  } catch (err) {
    console.error(`API failed: ${api} - ${err.message}`);
    lastError = err;
  }
}

if (!data) {
  throw new Error(`All football APIs failed: ${lastError?.message || 'unknown error'}`);
}

let items = walk(data);

const seen = new Set();

items = items.filter(item => {
  if (seen.has(item.url)) return false;
  seen.add(item.url);
  return true;
});

const esc = s =>
  String(s).replace(/[,\\r\\n]/g, ' ').trim();

let m3u = '#EXTM3U\\n';

for (const item of items) {
  m3u +=
    '#EXTINF:-1 group-title="⚽ BÓNG ĐÁ",' +
    esc(item.title) +
    '\\n' +
    item.url +
    '\\n';
}

if (items.length === 0) {
  console.error('API returned data but no stream URLs were found.');
}

console.error(`Generated ${items.length} football streams`);

process.stdout.write(m3u);
