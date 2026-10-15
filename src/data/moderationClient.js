// Optional local moderation signal; never an authority for public distribution.
// Server receives text and images only. Video MUST undergo a separate review.
const MODERATION_URL = process.env.REACT_APP_MODERATION_URL || 'http://127.0.0.1:8790';
export async function getModerationSignal(text, file) {
  if (file?.type.startsWith('video/')) return { status: 'pending_review', reasons: ['Video requires full frame, audio and human moderation'] };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let base64 = null;
    if (file) base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Cannot read image.'));
      reader.readAsDataURL(file);
    });
    const response = await fetch(`${MODERATION_URL}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, imageDataUrl: base64 }), signal: controller.signal });
    if (!response.ok) throw new Error('Moderation unavailable');
    const data = await response.json();
    if (!['review_required','pending_review','rejected'].includes(data.status)) throw new Error('Unexpected moderation response');
    return { status: data.status === 'review_required' ? 'pending_review' : data.status, reasons: Array.isArray(data.reasons) ? data.reasons.slice(0,5) : ['Awaiting review'] };
  } catch { return { status: 'pending_review', reasons: ['Moderation service unavailable — review required'] }; }
  finally { clearTimeout(timer); }
}
