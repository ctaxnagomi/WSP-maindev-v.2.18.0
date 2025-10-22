// qr-auth.js
// Minimal scaffold for QRGGIF camera/upload handling
// - Opens camera to capture animated GIF
// - Accepts file upload as fallback
// - Computes placeholder animation hash (must be replaced by real GIF frame hashing logic)

async function openCameraAndCaptureGif(videoEl) {
  // Placeholder: returns null. Real implementation requires GIF capture logic.
  // We'll just request camera permission and show video stream as a starting point.
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoEl.srcObject = stream;
  videoEl.play();
  videoEl.style.display = 'block';
  return stream;
}

function stopCamera(stream) {
  if (!stream) return;
  stream.getTracks().forEach(t => t.stop());
  const videoEl = document.getElementById('qr-video');
  if (videoEl) {
    videoEl.pause();
    videoEl.srcObject = null;
    videoEl.style.display = 'none';
  }
}

function computePlaceholderHashFromFile(file) {
  // Placeholder: compute a simple SHA-256 of the file bytes as a stand-in for animation hash
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const data = new Uint8Array(e.target.result);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      resolve(hashHex);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Wire up UI actions
document.addEventListener('DOMContentLoaded', () => {
  const qrBtn = document.getElementById('qr-auth-btn');
  const uploadInput = document.getElementById('qr-upload-input');
  const video = document.getElementById('qr-video');
  let stream = null;

  qrBtn.addEventListener('click', async () => {
    // Open camera view
    try {
      stream = await openCameraAndCaptureGif(video);
      qrBtn.textContent = 'Stop Camera';
    } catch (err) {
      console.warn('Camera error', err);
      alert('Unable to access camera. You can upload a QRGGIF file instead.');
    }
  });

  // If button is clicked while camera running, stop it
  qrBtn.addEventListener('click', () => {
    if (qrBtn.textContent === 'Stop Camera' && stream) {
      stopCamera(stream);
      stream = null;
      qrBtn.textContent = 'QR Auth (QRGGIF)';
    }
  });

  uploadInput.addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const hash = await computePlaceholderHashFromFile(file);
      console.log('Computed placeholder hash:', hash);
      const out = document.getElementById('qr-hash-output');
      if (out) {
        out.style.display = 'block';
        out.textContent = `Placeholder hash: ${hash}`;
      }
      // TODO: replace placeholder hash with frame-based animation hash
    } catch (err) {
      console.error('Hash compute error', err);
      alert('Failed to compute file hash. See console for details.');
    }

    // TODO: send to Supabase RPC validate_qr_code(animation_hash_input, frame_data, nickname_input)
  });

  // Optional: stop camera on page unload
  window.addEventListener('beforeunload', () => stopCamera(stream));
});
