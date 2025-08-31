import { promises as fs } from 'fs';
import path from 'path';

const appFile = path.join('src', 'App.tsx');
const sitemapFile = path.join('public', 'sitemap.xml');

const content = await fs.readFile(appFile, 'utf8');
const routeRegex = /<Route\s+path="([^"]+)"/g;
const routes = [];
let match;
while ((match = routeRegex.exec(content)) !== null) {
  const route = match[1];
  if (route.includes(':') || route === '*') continue;
  routes.push(route);
}

const domain = process.env.SITE_URL ?? 'https://bitacora.plus';
const urls = routes.map((r) => `${domain}${r}`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

await fs.writeFile(sitemapFile, sitemap);
console.log(`Generated sitemap with ${routes.length} routes.`);
