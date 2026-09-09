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
  const imageHtml = data.image_url
    ? `<img src="${data.image_url}" alt="${data.name}" class="product-image">`
    : "";

  const flagsHtml = data.flags.length
    ? data.flags.map(flag => `<li>${flag}</li>`).join("")
    : "<li class='no-flags'>No high sugar, salt, or saturated fat flags triggered by our rule checks.</li>";

  const mlNote = data.ml_verdict === "unhealthy"
    ? `Our ML model independently rates this <strong>unhealthy</strong> (${Math.round((1 - data.ml_confidence) * 100)}% confidence).`
    : `Our ML model independently rates this <strong>healthy</strong> (${Math.round(data.ml_confidence * 100)}% confidence).`;

  const officialHtml = data.official_grade
    ? `
      <div class="badge-block">
        <div class="grade-badge grade-${data.official_grade}">
          <span class="grade-letter">${data.official_grade}</span>
          <span class="grade-score">${data.official_score}/100</span>
        </div>
        <p class="badge-label">Official Nutri-Score (Open Food Facts)</p>
      </div>`
    : `
      <div class="badge-block">
        <div class="grade-badge grade-unknown">
          <span class="grade-letter">?</span>
        </div>
        <p class="badge-label">No official Nutri-Score available</p>
      </div>`;

  document.getElementById("result").innerHTML = `
    ${imageHtml}
    <h2 class="product-name">${data.name}</h2>

    <div class="badges-row">
      <div class="badge-block">
        <div class="grade-badge grade-${data.our_grade}">
          <span class="grade-letter">${data.our_grade}</span>
          <span class="grade-score">${data.our_score}/100</span>
        </div>
        <p class="badge-label">Our Score</p>
      </div>

      ${officialHtml}
    </div>

    <div class="explanation-block">
      <h3>Why this score?</h3>
      <ul class="flags-list">${flagsHtml}</ul>
      <p class="ml-note">${mlNote}</p>
    </div>
  `;
}
