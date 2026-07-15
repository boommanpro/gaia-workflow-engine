#!/usr/bin/env node
/**
 * Generate a static Star History SVG chart using GitHub Stargazers API.
 * Usage: node scripts/gen-star-history.mjs <token> [owner/repo]
 * Saves to docs/images/star-history.svg
 */
import https from 'node:https';

const token = process.argv[2] || process.env.GH_TOKEN;
const repo = process.argv[3] || 'boommanpro/gaia-workflow-engine';
const [owner, name] = repo.split('/');

if (!token) {
  console.error('Error: GitHub token required as first arg or GH_TOKEN env');
  process.exit(1);
}

function ghRequest(path, page = 1) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `${path}?per_page=100&page=${page}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'star-history-gen',
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), link: res.headers.link || '' });
        } catch {
          resolve({ status: res.statusCode, data: body, link: res.headers.link || '' });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllStarTimestamps() {
  const stars = [];
  let page = 1;
  // Use the starred_at version of the stargazers API via repo header
  while (true) {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${name}/stargazers?per_page=100&page=${page}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.star+json', // returns starred_at
        'User-Agent': 'star-history-gen',
      },
    };
    const data = await new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: [] });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    if (data.status !== 200) {
      console.error(`GitHub API error ${data.status}:`, JSON.stringify(data.data).slice(0, 200));
      break;
    }
    if (!Array.isArray(data.data) || data.data.length === 0) break;
    for (const s of data.data) {
      if (s.starred_at) stars.push(new Date(s.starred_at).getTime());
    }
    if (data.data.length < 100) break;
    page++;
    if (page > 40) break; // safety: 4000 stars max
  }
  return stars.sort((a, b) => a - b);
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])
  );
}

function generateSvg(stamps, repoName) {
  const W = 800;
  const H = 360;
  const PAD = { l: 56, r: 24, t: 36, b: 48 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const total = stamps.length;
  const t0 = stamps[0];
  const t1 = Date.now();
  const tRange = Math.max(t1 - t0, 1);

  // build cumulative points
  const pts = [];
  pts.push([0, 0]);
  stamps.forEach((t, i) => {
    const x = (t - t0) / tRange;
    pts.push([x, i + 1]);
  });

  const maxY = Math.max(total, 1);
  const toPx = (x, y) => [PAD.l + x * cw, PAD.t + ch - (y / maxY) * ch];

  const pathD = pts
    .map((p, i) => {
      const [px, py] = toPx(p[0], p[1]);
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

  const fillD =
    `${pathD} L${(PAD.l + cw).toFixed(1)},${(PAD.t + ch).toFixed(1)} L${PAD.l.toFixed(1)},${(PAD.t + ch).toFixed(1)} Z`;

  // x-axis ticks (months)
  const xTicks = [];
  const d0 = new Date(t0);
  const months =
    (new Date(t1).getFullYear() - d0.getFullYear()) * 12 + (new Date(t1).getMonth() - d0.getMonth());
  const tickCount = Math.min(months, 6);
  for (let i = 0; i <= tickCount; i++) {
    const frac = tickCount === 0 ? 0 : i / tickCount;
    const dt = new Date(t0 + frac * tRange);
    const lbl = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const [px] = toPx(frac, 0);
    xTicks.push({ x: px, lbl });
  }

  // y-axis ticks
  const yTicks = [];
  const yTickCount = 4;
  for (let i = 0; i <= yTickCount; i++) {
    const v = Math.round((total * i) / yTickCount);
    const [, py] = toPx(0, v);
    yTicks.push({ y: py, lbl: String(v) });
  }

  const lineColor = '#4d53e8';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${PAD.l}" y="${PAD.t - 14}" font-size="14" font-weight="600" fill="#111">${escapeXml(repoName)}</text>
  <text x="${W - PAD.r}" y="${PAD.t - 14}" font-size="12" fill="#888" text-anchor="end">★ ${total} stars</text>
  <rect x="${PAD.l}" y="${PAD.t}" width="${cw}" height="${ch}" fill="#fafafa" stroke="#eee"/>
  ${yTicks
    .map(
      (t) =>
        `<line x1="${PAD.l}" y1="${t.y}" x2="${PAD.l + cw}" y2="${t.y}" stroke="#eee" stroke-dasharray="2,3"/>
         <text x="${PAD.l - 8}" y="${t.y + 4}" font-size="11" fill="#999" text-anchor="end">${t.lbl}</text>`
    )
    .join('\n  ')}
  ${xTicks
    .map(
      (t) =>
        `<line x1="${t.x}" y1="${PAD.t + ch}" x2="${t.x}" y2="${PAD.t + ch + 4}" stroke="#ccc"/>
         <text x="${t.x}" y="${PAD.t + ch + 20}" font-size="11" fill="#999" text-anchor="middle">${t.lbl}</text>`
    )
    .join('\n  ')}
  <path d="${fillD}" fill="${lineColor}" fill-opacity="0.08"/>
  <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="${PAD.l + cw}" cy="${PAD.t + ch - (total / maxY) * ch}" r="3.5" fill="${lineColor}"/>
</svg>`;
  return svg;
}

async function main() {
  console.log(`Fetching stargazers for ${repo} ...`);
  const stamps = await fetchAllStarTimestamps();
  console.log(`Got ${stamps.length} stargazers`);
  if (stamps.length === 0) {
    console.error('No stargazers found.');
    process.exit(1);
  }
  const svg = generateSvg(stamps, repo);
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const out = 'docs/images/star-history.svg';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  console.log(`Wrote ${out} (${stamps.length} stars)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
