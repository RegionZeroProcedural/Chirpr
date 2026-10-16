/* Automatic *prototype* classification: fail closed on unavailable services.
 * Video frame samples are NOT comprehensive video moderation, and video/audio
 * cannot be authorized for public distribution from this browser alone. */
const MODERATION_URL = process.env.REACT_APP_MODERATION_URL || 'http://127.0.0.1:8790';
const pending = reason => ({ status: 'pending_scan', reasons: [reason], basis: 'unavailable' });
function imageData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to prepare image'));
    reader.readAsDataURL(file);
  });
}
function seek(video, time) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timed out decoding a video frame')); }, 4000);
    const cleanup = () => { clearTimeout(timeout); video.removeEventListener('seeked', done); video.removeEventListener('error', failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Video frame decoding failed')); };
    video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', failed, { once: true });
    video.currentTime = time;
  });
}
export async function sampleVideoFrames(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto'; video.muted = true; video.playsInline = true;
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video metadata timeout')), 5000);
      video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
      video.onerror = () => { clearTimeout(timeout); reject(new Error('Cannot decode video')); };
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Unseekable video');
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 480 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No frame decoder');
    const frames = [];
    for (const fraction of [0.04, 0.25, 0.5, 0.75, 0.94]) {
      await seek(video, Math.min(video.duration - 0.001, Math.max(0, video.duration * fraction)));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.62));
    }
    return frames;
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}
export async function getModerationSignal(text, file) {
  const isVideo = !!file?.type.startsWith('video/');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const body = { text };
    if (isVideo) body.videoFrames = await sampleVideoFrames(file);
    else if (file) body.imageDataUrl = await imageData(file);
    const response = await fetch(`${MODERATION_URL}/api/scan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal
    });
    if (!response.ok) throw new Error('Automatic moderation unavailable');
    const data = await response.json();
    if (!['approved', 'sensitive', 'rejected', 'pending_scan'].includes(data.status)) throw new Error('Unexpected moderation result');
    const decision = { status: data.status, reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 8) : [], basis: data.basis || 'automatic' };
    // Sampled stills can identify sensitive frames and block disallowed content,
    // but cannot clear unsampled video or audio. Only a trusted full pipeline can.
    if (isVideo && decision.status === 'approved') return { status: 'pending_scan', reasons: ['Sampled frames passed; full video and audio screening not yet available'], basis: 'partial_video_scan' };
    if (isVideo && decision.status === 'sensitive') return { ...decision, scope: 'partial_video_scan', publicApproved: false };
    return decision;
  } catch { return pending('Automatic safety scanner unavailable — media is not public'); }
  finally { clearTimeout(timer); }
}
