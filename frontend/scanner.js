const API_BASE = "http://localhost:5000";

// ── Element references ───────────────────────────────────────────
const scanButton = document.getElementById("scan-button");
const scanBtnLabel = document.getElementById("scan-btn-label");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const cameraBadge = document.getElementById("camera-badge");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("barcode-file-input");
const manualForm = document.getElementById("manual-form");
const manualInput = document.getElementById("manual-input");
const clearBtn = document.getElementById("clear-input-btn");
const soundToggle = document.getElementById("sound-toggle");
const soundIconOn = document.getElementById("sound-icon-on");
const soundIconOff = document.getElementById("sound-icon-off");
const resultEmpty = document.getElementById("result-empty");
const resultLoading = document.getElementById("result-loading");
const resultBox = document.getElementById("result");
const historyList = document.getElementById("history-list");
const historyCount = document.getElementById("history-count");
const toastHub = document.getElementById("toast-hub");
const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalClose = document.getElementById("modal-close");

let cameraRunning = false;
let lastScanned = null;
let soundEnabled = true;

// ── Toasts ────────────────────────────────────────────────────────

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastHub.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Modal (centered popup, used for "not found") ────────────────────

function showModal(message) {
  modalMessage.textContent = message;
  modalOverlay.classList.remove("hidden");
}

function hideModal() {
  modalOverlay.classList.add("hidden");
}

modalClose.addEventListener("click", hideModal);

// Clicking the dark backdrop (not the card itself) also closes it —
// checking event.target lets us tell the two apart, since both trigger
// the same "click" event on this listener.
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideModal();
});

// ── Sound ─────────────────────────────────────────────────────────

function playBeep() {
  if (!soundEnabled) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundIconOn.classList.toggle("hidden", !soundEnabled);
  soundIconOff.classList.toggle("hidden", soundEnabled);
});

// ── Camera ────────────────────────────────────────────────────────

scanButton.addEventListener("click", () => {
  if (cameraRunning) {
    stopCamera();
  } else {
    startCamera();
  }
});

function startCamera() {
  Quagga.init(
    {
      inputStream: {
        type: "LiveStream",
        target: document.querySelector("#camera-feed"),
        constraints: { facingMode: "environment" },
      },
      decoder: { readers: ["ean_reader", "upc_reader"] },
    },
    (err) => {
      if (err) {
        console.error(err);
        showToast("Couldn't access the camera — try upload or manual entry.", "error");
        return;
      }
      Quagga.start();
      cameraRunning = true;
      cameraPlaceholder.classList.add("hidden");
      cameraBadge.classList.remove("hidden");
      scanBtnLabel.textContent = "Stop Camera";
      scanButton.classList.add("is-active");
    }
  );
}

function stopCamera() {
  Quagga.stop();
  cameraRunning = false;
  cameraPlaceholder.classList.remove("hidden");
  cameraBadge.classList.add("hidden");
  scanBtnLabel.textContent = "Start Camera";
  scanButton.classList.remove("is-active");
}

Quagga.onDetected((result) => {
  const barcode = result.codeResult.code;
  if (barcode === lastScanned) return;
  lastScanned = barcode;

  stopCamera();
  playBeep();
  lookupBarcode(barcode);
});

// ── Upload photo ──────────────────────────────────────────────────

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    Quagga.decodeSingle(
      {
        src: reader.result,
        decoder: { readers: ["ean_reader", "upc_reader"] },
        locate: true,
      },
      (result) => {
        if (result && result.codeResult) {
          playBeep();
          lookupBarcode(result.codeResult.code);
        } else {
          showToast("No barcode found in that image.", "error");
        }
      }
    );
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
});

// ── Demo chips ────────────────────────────────────────────────────

document.querySelectorAll(".demo-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    lookupBarcode(chip.dataset.barcode);
  });
});

// ── Manual entry ──────────────────────────────────────────────────

manualInput.addEventListener("input", () => {
  clearBtn.classList.toggle("hidden", manualInput.value.length === 0);
});

clearBtn.addEventListener("click", () => {
  manualInput.value = "";
  clearBtn.classList.add("hidden");
  manualInput.focus();
});

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const barcode = manualInput.value.trim();
  if (!barcode) return;
  lookupBarcode(barcode);
});

// ── State switching ───────────────────────────────────────────────

function setState(state) {
  resultEmpty.classList.add("hidden");
  resultLoading.classList.add("hidden");
  resultBox.classList.add("hidden");

  if (state === "empty") resultEmpty.classList.remove("hidden");
  if (state === "loading") resultLoading.classList.remove("hidden");
  if (state === "result") resultBox.classList.remove("hidden");
}

// ── Lookup + render ───────────────────────────────────────────────

async function lookupBarcode(barcode) {
  setState("loading");

  try {
    const res = await fetch(`${API_BASE}/api/scan/${barcode}`);

    if (res.status === 404) {
      showModal(`No product found for barcode ${barcode}. It may not be in Open Food Facts yet.`);
      setState("empty");
      return;
    }
    if (!res.ok) {
      showToast(`Server error (${res.status}).`, "error");
      setState("empty");
      return;
    }

    const data = await res.json();
    renderResult(data, resultBox);          // shared function, from common.js
    setState("result");

    if (data.cached) {
      showToast(`${data.name} — loaded from history, not re-processed.`);
    } else {
      showToast(`${data.name} scanned successfully.`);
    }

    document.getElementById("result-section").scrollIntoView({ behavior: "smooth", block: "start" });

    loadHistory();
  } catch (err) {
    console.error(err);
    showToast("Couldn't reach the backend — is Flask running?", "error");
    setState("empty");
  }
}

// ── Mini history list (last 5, clickable) ──────────────────────────

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    if (!res.ok) return;
    const scans = await res.json();

    historyCount.textContent = scans.length;

    if (!scans.length) {
      historyList.innerHTML = `<p class="history-empty">No scans yet.</p>`;
      return;
    }

    historyList.innerHTML = scans.slice(0, 5).map(renderHistoryItemHtml).join("");

    // Clicking a mini history row shows that result right here, no re-fetch needed —
    // we already have the full data for it from this same /api/history response.
    document.querySelectorAll(".history-item-clickable").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        renderResult(scans[i], resultBox);
        setState("result");
      });
    });
  } catch (err) {
    console.error("Couldn't load history:", err);
  }
}

loadHistory();
