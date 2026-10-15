// QR reading for the sticker hub: live camera (BarcodeDetector where the browser has it,
// jsQR everywhere else, e.g. iPhone Safari) and a photo fallback for browsers that
// block the camera (some in-app browsers).
import jsQR from 'jsqr';

const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
let detector = null;
async function getDetector() {
  if (!hasDetector) return null;
  if (detector) return detector;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats?.();
    if (formats && !formats.includes('qr_code')) return null;
    detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    detector = null;
  }
  return detector;
}

const work = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const wctx = work?.getContext('2d', { willReadFrequently: true });

/** Decode one frame / image. Returns the QR text or null. */
export async function decode(source, w, h) {
  const d = await getDetector();
  if (d) {
    try {
      const codes = await d.detect(source);
      if (codes?.length) return codes[0].rawValue;
      return null;
    } catch {
      /* fall through to jsQR */
    }
  }
  if (!w || !h) return null;
  // jsQR on a downscaled copy (max 640 px) keeps it fast on phones.
  const s = Math.min(1, 640 / Math.max(w, h));
  work.width = Math.round(w * s);
  work.height = Math.round(h * s);
  wctx.drawImage(source, 0, 0, work.width, work.height);
  const img = wctx.getImageData(0, 0, work.width, work.height);
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  return r ? r.data : null;
}

export const cameraSupported = () => !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false;

/**
 * Live camera scanner into a <video>.
 * @returns {Promise<{stop(): void}>} rejects with an Error whose .code is 'unsupported' | 'denied' | 'nocamera' | 'failed'
 */
export async function startCamera(video, onResult) {
  if (!cameraSupported()) throw Object.assign(new Error('no camera API'), { code: 'unsupported' });
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    const name = e?.name || '';
    const code = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'failed';
    throw Object.assign(new Error(name || 'camera failed'), { code });
  }
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    /* iOS sometimes needs a second tick; the loop below waits for frames anyway */
  }
  let running = true;
  let busy = false;
  const tick = async () => {
    if (!running) return;
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      busy = true;
      try {
        const text = await decode(video, video.videoWidth, video.videoHeight);
        if (text && running) onResult(text);
      } catch {
        /* keep scanning */
      }
      busy = false;
    }
    if (running) setTimeout(tick, 120);
  };
  tick();
  return {
    stop() {
      running = false;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

/** Read a QR from a photo file (camera capture or gallery). */
export async function decodeFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await decode(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
