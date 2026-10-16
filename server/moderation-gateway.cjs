/* Chirpr development-only AUTOMATED content classifier.
 * DO NOT deploy as a public moderation authority: no authentication, upload
 * integrity binding, CSAM hashing, audio processing or adversarial scanning.
 * Inputs are short text and image frames. Videos need full server-side analysis
 * before any public release; a few samples cannot certify a whole video.
 * Requires Node 20+ and OPENAI_API_KEY set on server, never client.
 */
const http = require('node:http');
const { URL } = require('node:url');
const PORT = Number(process.env.MODERATION_PORT || 8790);
const MAX_REQUEST = 18 * 1024 * 1024;
const KEY = process.env.OPENAI_API_KEY;
const origin = process.env.CHIRPR_UI_ORIGIN || 'http://localhost:3000';
function decisionFromResults(results) {
  const categories = new Set();
  for (const result of results) {
    for (const [key, flagged] of Object.entries(result.categories || {})) {
      if (flagged) categories.add(key);
    }
  }
  const severe = ['sexual/minors', 'violence/graphic', 'self-harm/intent', 'self-harm/instructions', 'illicit/violent'];
  if (severe.some(category => categories.has(category))) {
    return { status: 'rejected', reasons: [...categories], basis: 'automatic', scope: 'frames_and_text' };
  }
  const sensitive = ['sexual', 'violence', 'self-harm'];
  if (sensitive.some(category => categories.has(category))) {
    return { status: 'sensitive', reasons: [...categories].map(c => c === 'sexual' ? 'Sexual imagery' : c === 'violence' ? 'Violent imagery' : c === 'self-harm' ? 'Self-harm themes' : c), basis: 'automatic', scope: 'frames_and_text' };
  }
  // Other policy violations (harassment/hate) are held, not displayed unblurred.
  if (categories.size) return { status: 'rejected', reasons: [...categories], basis: 'automatic', scope: 'frames_and_text' };
  return { status: 'approved', reasons: [], basis: 'automatic', scope: 'frames_and_text' };
}
async function scan(input) {
  if (!KEY) return { status: 'pending_scan', reasons: ['Automatic classifier not configured'], basis: 'unavailable' };
  const images = [input.imageDataUrl, ...(Array.isArray(input.videoFrames) ? input.videoFrames.slice(0, 6) : [])].filter(Boolean);
  if (images.length > 7 || images.some(image => typeof image !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(image) || image.length > MAX_REQUEST)) throw new Error('Invalid image');
  const values = [{ type: 'text', text: String(input.text || ' ').slice(0, 2000) }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))];
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: values }), signal: AbortSignal.timeout(16000)
  });
  if (!response.ok) throw new Error('Upstream moderation request failed');
  const body = await response.json();
  if (!Array.isArray(body.results) || !body.results.length) throw new Error('Missing classification');
  return decisionFromResults(body.results);
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
    for await (const chunk of req) { length += chunk.length; if (length > MAX_REQUEST) throw Error('Payload too large'); chunks.push(chunk); }
    const result = await scan(JSON.parse(Buffer.concat(chunks).toString()));
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(error.message === 'Payload too large' ? 413 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'pending_scan', reasons: ['Automated safety scan unavailable'], basis: 'unavailable' }));
  }
});
if (require.main === module) server.listen(PORT, '127.0.0.1', () => console.log(`Chirpr development content classifier: http://127.0.0.1:${PORT}`));
module.exports = { decisionFromResults, scan, server };
