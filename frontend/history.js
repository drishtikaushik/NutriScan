const API_BASE = "http://localhost:5000";

const listEl = document.getElementById("history-page-list");
const searchInput = document.getElementById("history-search");
const detailSection = document.getElementById("history-detail-section");
const detailBox = document.getElementById("history-detail");

let allScans = [];   // fetched once, filtered in-browser as the user types

async function loadAllHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    allScans = await res.json();
    renderList(allScans);
  } catch (err) {
    listEl.innerHTML = `<p class="history-empty">Couldn't load history — is Flask running?</p>`;
  }
}

function renderList(scans) {
  if (!scans.length) {
    listEl.innerHTML = `<p class="history-empty">No matching scans.</p>`;
    return;
  }

  listEl.innerHTML = scans.map(renderHistoryItemHtml).join("");

  // Wire up clicks fresh each time the list re-renders (search included)
  document.querySelectorAll(".history-item-clickable").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      renderResult(scans[i], detailBox);
      detailSection.classList.remove("hidden");
      detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ── Search: filter the already-fetched array, no extra network call ──

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderList(allScans);
    return;
  }

  const filtered = allScans.filter(
    (scan) =>
      scan.name.toLowerCase().includes(query) ||
      scan.barcode.includes(query)
  );
  renderList(filtered);
});

loadAllHistory();
