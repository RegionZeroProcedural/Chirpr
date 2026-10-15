/* Chirpr LOCAL-ONLY moderation signal gateway, no dependencies (Node 20+).
 * DO NOT expose on a network or treat this as public upload approval.
 * All results require review. Videos are deliberately unsupported.
 * For real deployment: authentication, quotas, quarantine, multipart
 * streaming, malware/CSAM detection, comprehensive video/audio review,
 * appeal tools, human moderator roles and audit logs are required.
 */
const http = require('node:http');
const PORT = Number(process.env.MODERATION_PORT || 8790);
const MAX = 18 * 1024 * 1024;
const KEY = process.env.OPENAI_API_KEY;
const origin = process.env.CHIRPR_UI_ORIGIN || 'http://localhost:3000';
const { URL } = require('node:url');
const categoriesForReview = new Set(['sexual', 'violence', 'violence/graphic', 'self-harm', 'harassment', 'hate', 'illicit']);
async function scan(input) {
  if (!KEY) return { status: 'pending_review', reasons: ['Moderation API key not configured — manual review required'] };
  const values = [{ type: 'text', text: String(input.text || ' ').slice(0, 2000) }];
  if (input.imageDataUrl) {
    if (!/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(input.imageDataUrl) || input.imageDataUrl.length > MAX) throw Error('Invalid image data');
    values.push({ type: 'image_url', image_url: { url: input.imageDataUrl } });
  }
  const signal = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: values }), signal: AbortSignal.timeout(11000)
  });
  if (!signal.ok) throw Error('Upstream moderation request failed');
  const response = await signal.json();
  const results = response.results || [];
  if (!results.length) throw Error('Missing moderation result');
  const labels = [...new Set(results.flatMap(r => Object.keys(r.categories || {}).filter(category => r.categories[category] && categoriesForReview.has(category.split('/')[0]) || r.categories?.[category] && categoriesForReview.has(category))))];
  return { status: 'review_required', reasons: labels.length ? labels : ['Automated scan completed — human approval still required'] };
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || new URL(req.url, 'http://localhost').pathname !== '/api/scan') { res.writeHead(404); return res.end(); }
  const chunks = []; let length = 0;
  try {
    for await (const chunk of req) { length += chunk.length; if (length > MAX) throw Error('Payload too large'); chunks.push(chunk); }
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    const result = await scan(payload);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
  } catch (error) {
    const oversize = error.message === 'Payload too large';
    res.writeHead(oversize ? 413 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'pending_review', reasons: ['Review pending due to scanning error'] }));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Chirpr LOCAL moderation signals: http://127.0.0.1:${PORT}`));
