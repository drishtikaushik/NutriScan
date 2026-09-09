let lastScanned = null;

function startCamera() {
  Quagga.init({
    inputStream: {
      type: "LiveStream",
      target: document.querySelector("#camera-feed"),
      constraints: { facingMode: "environment" }
    },
    decoder: { readers: ["ean_reader", "upc_reader"] }
  }, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Quagga initialized, starting camera");
    Quagga.start();
  });
}

Quagga.onDetected(function(result) {
  const barcode = result.codeResult.code;

  if (barcode === lastScanned) {
    return;
  }
  lastScanned = barcode;

  console.log("Detected barcode:", barcode);
  Quagga.stop();

  lookupBarcode(barcode);
});

// ── NEW: wire the button to start the camera ──────────────
const scanButton = document.getElementById("scan-button");
scanButton.addEventListener("click", startCamera);

// ── manual entry (unchanged) ──────────────────────────────
const manualForm = document.getElementById("manual-form");

manualForm.addEventListener("submit", function(event) {
  event.preventDefault();
  const barcode = document.getElementById("manual-input").value;
  lookupBarcode(barcode);
});

function lookupBarcode(barcode) {
  fetch(`http://localhost:5000/api/scan/${barcode}`)
    .then(response => response.json())
    .then(data => {
      console.log(data);
      renderResult(data);
    });
}

function renderResult(data) {
  const grade = data.final_grade;
  const score = data.final_score;

  const imageHtml = data.image_url
    ? `<img src="${data.image_url}" alt="${data.name}" class="product-image">`
    : "";

  const flagsHtml = data.flags.length
    ? data.flags.map(flag => `<li>${flag}</li>`).join("")
    : "<li class='no-flags'>Our basic sugar/salt/fat checks found no issues — the official grade may still reflect other factors (like added sugars in a beverage, low fiber, or category-specific scoring).</li>";

  const mlNote = data.ml_verdict === "unhealthy"
    ? `Our ML model also independently rates this <strong>unhealthy</strong> (${Math.round((1 - data.ml_confidence) * 100)}% confidence).`
    : `Our ML model independently rates this <strong>healthy</strong> (${Math.round(data.ml_confidence * 100)}% confidence).`;

  document.getElementById("result").innerHTML = `
    ${imageHtml}
    <h2 class="product-name">${data.name}</h2>

    <div class="grade-badge grade-${grade}">
      <span class="grade-letter">${grade}</span>
      <span class="grade-score">${score}/100</span>
    </div>
    <p class="grade-source">Official Nutri-Score grade, from Open Food Facts</p>

    <div class="explanation-block">
      <h3>Why this grade?</h3>
      <ul class="flags-list">${flagsHtml}</ul>
      <p class="ml-note">${mlNote}</p>
    </div>
  `;
}