// Improved QRGGIF app.js
// - Full GIF compositing using gifuct-js frame patches
// - Single persistent Tesseract worker for performance
// - Image preprocessing before OCR (resize + simple threshold)
// Watermark: QRGGIF (GG) by Wan Mohd Azizi

const gifInput = document.getElementById('gifInput');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const cameraPreview = document.getElementById('cameraPreview');
const frameCanvas = document.getElementById('frameCanvas');
const framesList = document.getElementById('framesList');
const recognizedText = document.getElementById('recognizedText');
const animHash = document.getElementById('animHash');
const runDetectBtn = document.getElementById('runDetect');
const sendApiBtn = document.getElementById('sendApi');
const ocrFilterInput = document.getElementById('ocrFilter');

let currentStream = null;
let latestAnimationHash = null;
let latestRecognizedFrames = [];
let tesseractWorker = null;

// Approved unicode set (small sample) - use full list from project docs in real usage
const APPROVED_UNICODE = new Set([
  'ℍ','ℎ','∑','⑂','⑅','℁','←','↑','→','↓','∀','∂','∈','∉','√','∝','∞'
]);

async function initTesseractWorker() {
  if (tesseractWorker) return tesseractWorker;
  tesseractWorker = Tesseract.createWorker({
    logger: m => console.log('[TESSERACT]', m)
  });
  await tesseractWorker.load();
  await tesseractWorker.loadLanguage('eng');
  await tesseractWorker.initialize('eng');
  return tesseractWorker;
}

// Utility: compute SHA-256 hex
async function sha256hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2,'0')).join('');
}

// Preprocess: resize and simple threshold to improve OCR for glyphs
function preprocessDataUrl(dataUrl, maxDim = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const scale = Math.min(1, maxDim / Math.max(w,h));
      const sw = Math.max(200, Math.floor(w * scale));
      const sh = Math.max(200, Math.floor(h * scale));
      const c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, sw, sh);
      // convert to grayscale + increase contrast
      const id = ctx.getImageData(0,0,sw,sh);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        const t = gray > 150 ? 255 : 0; // aggressive threshold
        d[i] = d[i+1] = d[i+2] = t;
      }
      ctx.putImageData(id, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

// Run OCR on a dataURL image using the persistent Tesseract worker
async function runOcrOnDataUrl(dataUrl) {
  await initTesseractWorker();
  const pre = await preprocessDataUrl(dataUrl);
  const { data: { text } } = await tesseractWorker.recognize(pre);
  return text;
}

// Filter recognized text to approved unicode or the optional filter
function filterRecognizedText(text, optionalFilter) {
  if (optionalFilter && optionalFilter.trim().length > 0) {
    try {
      const re = new RegExp(optionalFilter, 'g');
      return (text.match(re) || []).join('').trim();
    } catch (e) {
      console.warn('Invalid regex filter', e);
      return '';
    }
  }
  return Array.from(text).filter(ch => APPROVED_UNICODE.has(ch)).join('');
}

// Compose GIF frames into full canvas frames (handles disposal types 0/1/2/3 best-effort)
function composeGifFrames(arrayBuffer) {
  const gif = gifuct.parseGIF(arrayBuffer);
  const rawFrames = gifuct.decompressFrames(gif, true);
  const w = gif.lsd.width;
  const h = gif.lsd.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,w,h);
  const composed = [];
  let previousImageData = null;
  for (let i = 0; i < rawFrames.length; i++) {
    const f = rawFrames[i];
    // Save previous if disposalType === 3 (restore to previous)
    if (f.disposalType === 3) {
      previousImageData = ctx.getImageData(0,0,w,h);
    }
    // Draw patch onto canvas
    // Create ImageData for patch
    try {
      const patchW = f.dims.width;
      const patchH = f.dims.height;
      const imageData = ctx.getImageData(0,0,w,h);
      const dest = imageData.data;
      const src = f.patch; // Uint8ClampedArray RGBA
      for (let row = 0; row < patchH; row++) {
        for (let col = 0; col < patchW; col++) {
          const srcIdx = (row * patchW + col) * 4;
          const dstX = f.dims.left + col;
          const dstY = f.dims.top + row;
          if (dstX < 0 || dstX >= w || dstY < 0 || dstY >= h) continue;
          const dstIdx = (dstY * w + dstX) * 4;
          // Copy RGBA
          dest[dstIdx] = src[srcIdx];
          dest[dstIdx+1] = src[srcIdx+1];
          dest[dstIdx+2] = src[srcIdx+2];
          dest[dstIdx+3] = src[srcIdx+3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (err) {
      console.warn('Frame compositing error', err);
    }
    // Save a dataURL for this composed frame
    const dataUrl = canvas.toDataURL('image/png');
    composed.push({ dataUrl, delay: f.delay });
    // Handle disposal
    if (f.disposalType === 2) {
      // restore to background color: clear the patched region
      ctx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
    } else if (f.disposalType === 3 && previousImageData) {
      // restore to previous
      ctx.putImageData(previousImageData, 0, 0);
      previousImageData = null;
    }
  }
  return composed;
}

// Process GIF file: extract frames (composited), OCR per-frame, compute ordered hash
async function processGifArrayBuffer(ab) {
  framesList.innerHTML = '';
  recognizedText.textContent = '';
  animHash.textContent = '';
  latestRecognizedFrames = [];

  const composed = composeGifFrames(ab);
  await initTesseractWorker();
  for (let i = 0; i < composed.length; i++) {
    const { dataUrl } = composed[i];
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'frame-thumb';
    framesList.appendChild(img);
    try {
      const text = await runOcrOnDataUrl(dataUrl);
      const filtered = filterRecognizedText(text, ocrFilterInput.value);
      latestRecognizedFrames.push(filtered || '');
      recognizedText.textContent += `Frame ${i}: ${filtered}\n`;
    } catch (err) {
      console.error('OCR error', err);
      latestRecognizedFrames.push('');
    }
  }

  // Build ordered payload and compute hash
  const payload = latestRecognizedFrames.join('|');
  const hash = await sha256hex(payload);
  latestAnimationHash = hash;
  animHash.textContent = hash;
  sendApiBtn.disabled = false;
}

// Handle GIF upload
gifInput.addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const ab = await file.arrayBuffer();
  await processGifArrayBuffer(ab);
});

// Camera capture: capture a short sequence and treat as frames (best-effort demo)
startCameraBtn.addEventListener('click', async () => {
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    cameraPreview.srcObject = currentStream;
    cameraPreview.style.display = 'block';
    stopCameraBtn.disabled = false;
    startCameraBtn.disabled = true;
  } catch (err) {
    alert('Camera start failed: ' + err.message);
  }
});

stopCameraBtn.addEventListener('click', async () => {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
  cameraPreview.srcObject = null;
  cameraPreview.style.display = 'none';
  stopCameraBtn.disabled = true;
  startCameraBtn.disabled = false;
});

// Run detection from camera by capturing several frames from video and running OCR
runDetectBtn.addEventListener('click', async () => {
  if (cameraPreview && cameraPreview.style.display !== 'none' && currentStream) {
    // capture 6 frames spaced by 300ms
    const off = frameCanvas.getContext('2d');
    frameCanvas.width = cameraPreview.videoWidth || 640;
    frameCanvas.height = cameraPreview.videoHeight || 480;
    const frames = [];
    for (let i = 0; i < 6; i++) {
      off.drawImage(cameraPreview, 0, 0, frameCanvas.width, frameCanvas.height);
      const dataUrl = frameCanvas.toDataURL('image/png');
      frames.push(dataUrl);
      await new Promise(r => setTimeout(r, 300));
    }

    // OCR each frame
    framesList.innerHTML = '';
    recognizedText.textContent = '';
    latestRecognizedFrames = [];
    await initTesseractWorker();
    for (let i = 0; i < frames.length; i++) {
      const text = await runOcrOnDataUrl(frames[i]);
      const filtered = filterRecognizedText(text, ocrFilterInput.value);
      latestRecognizedFrames.push(filtered || '');
      recognizedText.textContent += `Frame ${i}: ${filtered}\n`;
      const img = document.createElement('img');
      img.src = frames[i]; img.className = 'frame-thumb'; framesList.appendChild(img);
    }
    const payload = latestRecognizedFrames.join('|');
    const hash = await sha256hex(payload);
    latestAnimationHash = hash;
    animHash.textContent = hash;
    sendApiBtn.disabled = false;
  } else {
    alert('Start camera or upload a GIF first');
  }
});

// Send to API (minimal POST) - by default POSTs to local stub; admin page can call Supabase RPC
sendApiBtn.addEventListener('click', async () => {
  if (!latestAnimationHash) return alert('No hash computed');
  try {
    const res = await fetch('/api/validate-qrg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animation_hash: latestAnimationHash })
    });
    const json = await res.json();
    document.getElementById('apiResponse').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    console.error('API error', err);
    document.getElementById('apiResponse').textContent = 'API error: ' + err.message;
  }
});

// Enable/disable send button when hash present
setInterval(() => {
  sendApiBtn.disabled = !latestAnimationHash;
}, 500);
