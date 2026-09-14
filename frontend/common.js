// Shared between index.html and history.html — one rendering function,
// used everywhere a full result needs to be displayed.

function renderResult(data, container) {
  const imageHtml = data.image_url
    ? `<img src="${data.image_url}" alt="${data.name}" class="product-image">`
    : "";

  if (data.insufficient_data) {
    container.innerHTML = `
      ${imageHtml}
      <h2 class="product-name">${data.name}</h2>
      <div class="insufficient-card">
        <h3>Not enough data to score this product</h3>
        <p>Open Food Facts doesn't have sugar, salt, saturated fat, or energy data for this item yet — scoring on missing data would risk showing a misleading result, so we're not guessing.</p>
      </div>
    `;
    return;
  }

  // ... the rest of your existing function, unchanged, continues below

  const flagsHtml = data.flags.length
    ? data.flags.map((f) => `<li>${f}</li>`).join("")
    : "<li class='no-flags'>No high sugar, salt, or saturated fat flags triggered.</li>";

  const officialBadge = data.official_grade
    ? `<div class="grade-badge grade-${data.official_grade}">
         <span class="grade-letter">${data.official_grade}</span>
         <span class="grade-score">${data.official_score}/100</span>
       </div>`
    : `<div class="grade-badge grade-unknown"><span class="grade-letter">?</span></div>`;

  const mlPercent = data.ml_verdict === "unhealthy"
    ? Math.round((1 - data.ml_confidence) * 100)
    : Math.round(data.ml_confidence * 100);

  const factorsHtml = data.ml_top_factors && data.ml_top_factors.length
    ? data.ml_top_factors.map(f => `<li>${f.name}: ${f.value}g per 100g</li>`).join("")
    : "";

  container.innerHTML = `
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
      <div class="badge-block">
        ${officialBadge}
        <p class="badge-label">Official Nutri-Score</p>
      </div>
    </div>
    <div class="explanation-block">
      <h3>Why this score?</h3>
      <ul class="flags-list">${flagsHtml}</ul>
      <div class="score-breakdown">
        <div class="breakdown-row">
          <span>Rule-based check</span>
          <span>${data.rule_score}/100</span>
        </div>
        <div class="breakdown-row">
          <span>ML model opinion</span>
          <span>${data.ml_verdict} (${mlPercent}% confident)</span>
        </div>
        <div class="breakdown-row breakdown-total">
          <span>Blended into Our Score</span>
          <span>${data.our_score}/100</span>
        </div>
      </div>
      ${factorsHtml ? `
        <p class="ml-factors-intro">Our model weighs these nutrients most heavily, based on patterns across ~400,000 products:</p>
        <ul class="flags-list">${factorsHtml}</ul>
      ` : ""}
    </div>
  `;
}

function renderHistoryItemHtml(item) {
  const time = new Date(item.timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `
    <button class="history-item history-item-clickable" data-barcode="${item.barcode}">
      <span><span class="verdict-dot ${item.our_grade}"></span>${item.name}</span>
      <span class="history-time">${time}</span>
    </button>
  `;
}
