// Frontend-only profile details: one record per uid. Replace this adapter with an
// authenticated API when Chirpr has a backend; never trust this as authorization.
export const PROFILE_DETAILS_KEY = 'chirpr-profile-details-v1';

const MAX_IMAGE_LENGTH = 550000;
const IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=]+$/i;
const limits = { displayName: 40, username: 20, bio: 240, pronouns: 32, location: 80, website: 180, interests: 360 };

export function normalizeProfileDetails(input = {}) {
  const cleaned = {};
  for (const [field, max] of Object.entries(limits)) {
    cleaned[field] = typeof input[field] === 'string' ? input[field].trim().slice(0, max) : '';
  }
  for (const field of ['avatarImage', 'bannerImage']) {
    const value = input[field];
    cleaned[field] = typeof value === 'string' && value.length < MAX_IMAGE_LENGTH && IMAGE_PATTERN.test(value) ? value : '';
  }
  return cleaned;
}

export function loadProfileDetails() {
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_DETAILS_KEY) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([uid, details]) => [uid, normalizeProfileDetails(details)]));
  } catch { return {}; }
}

export function saveProfileDetails(detailsByUid) {
  try { window.localStorage.setItem(PROFILE_DETAILS_KEY, JSON.stringify(detailsByUid)); return true; }
  catch { return false; }
}

export function mergeProfileDetails(baseUsers, detailsByUid) {
  return baseUsers.map(user => ({ ...user, ...detailsByUid[String(user.uid)] }));
}

// Resize images locally before saving so a profile doesn't exhaust localStorage.
export function prepareProfileImage(file, aspect = 1, maxWidth = 560) {
  if (!file?.type?.startsWith('image/')) return Promise.reject(new Error('Choose a valid image file.'));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Images must be smaller than 10 MB.'));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = Math.round(maxWidth / aspect);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Image editing is unavailable in this browser.');
        const croppedWidth = Math.min(img.width, img.height * aspect);
        const croppedHeight = croppedWidth / aspect;
        ctx.drawImage(img, (img.width - croppedWidth) / 2, (img.height - croppedHeight) / 2, croppedWidth, croppedHeight, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/jpeg', .78);
        if (result.length >= MAX_IMAGE_LENGTH) throw new Error('Image is too large to save. Try a smaller image.');
        resolve(result);
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not open that image.')); };
    img.src = url;
  });
}
