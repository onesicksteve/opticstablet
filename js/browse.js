const DATA_URL = "data/products.json";
const COMPARE_KEY = "rspb_compare_ids";
const MODE_KEY = "rspb_mode_staff";

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const titleEl = document.getElementById("pageTitle");
const searchEl = document.getElementById("search");

const tray = document.getElementById("compareTray");
const trayItems = document.getElementById("trayItems");
const trayHint = document.getElementById("trayHint");
const compareCount = document.getElementById("compareCount");
const clearCompareBtn = document.getElementById("clearCompare");
const goCompareBtn = document.getElementById("goCompare");

const modeToggle = document.getElementById("modeToggle");

let products = [];
let category = "binoculars";

function categoryLabel(cat){
  switch(cat){
    case "compact-binoculars": return "Browse compact binoculars";
    case "binoculars": return "Browse binoculars";
    case "spotting-scopes": return "Browse spotting scopes";
    default: return "Browse";
  }
}

function getCategoryFromUrl(){
  const url = new URL(window.location.href);
  return url.searchParams.get("cat") || "binoculars";
}

function formatGBP(n){
  if (typeof n !== "number") return "";
  return new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(n);
}

function getCompareIds(){
  try {
    const ids = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch { return []; }
}
function setCompareIds(ids){
  localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
}

function isStaffMode(){
  return localStorage.getItem(MODE_KEY) === "true";
}
function setStaffMode(v){
  localStorage.setItem(MODE_KEY, v ? "true" : "false");
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function matchesSearch(p, q){
  const text = (q || "").trim().toLowerCase();
  if (!text) return true;
  const hay = [p.brand, p.model].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(text);
}

function renderTray(){
  const ids = getCompareIds();
  compareCount.textContent = String(ids.length);

  if (ids.length === 0){
    tray.hidden = true;
    document.body.classList.remove("withTray");
    return;
  }

  tray.hidden = false;
  document.body.classList.add("withTray");

  const selected = ids
    .map(id => products.find(p => p.id === id))
    .filter(Boolean);

  trayItems.innerHTML = selected.map(p => `
    <div class="trayItem">
      <b>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</b><br/>
      ${escapeHtml(formatGBP(p.price_gbp))}
    </div>
  `).join("");

  if (ids.length === 1){
    trayHint.textContent = "Select another item to compare.";
    goCompareBtn.disabled = true;
  } else if (ids.length === 2){
    trayHint.textContent = "Opening compare…";
    goCompareBtn.disabled = false;
  } else {
    trayHint.textContent = "Select up to two products to compare.";
    goCompareBtn.disabled = true;
  }
}

function toggleCompare(id, checked){
  const ids = getCompareIds();

  if (checked){
    if (ids.includes(id)) return;

    if (ids.length >= 2){
      alert("You can only compare 2 items.");
      return;
    }
    ids.push(id);
    setCompareIds(ids);

    if (ids.length === 2){
      // Auto-open compare (locked behaviour)
      window.location.href = "compare.html";
      return;
    }
  } else {
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    setCompareIds(ids);
  }
}

function render(){
  const q = searchEl.value;
  const ids = getCompareIds();

  const filtered = products
    .filter(p => p.category === category)
    .filter(p => matchesSearch(p, q))
    .sort((a,b) => (a.price_gbp ?? 0) - (b.price_gbp ?? 0)); // price low -> high

  statusEl.textContent = filtered.length ? `${filtered.length} item(s)` : "No results";

  const staff = isStaffMode();

  grid.innerHTML = filtered.map(p => {
    const price = formatGBP(p.price_gbp);
    const selected = ids.includes(p.id);

    const bestFor = Array.isArray(p.best_for) ? p.best_for.slice(0, 5) : [];
    const thumb = p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : `<span>Image</span>`;

    // Highlights (locked trio)
    const warranty = p.warranty || "";
    const vfm = p.value_for_money || "";
    const weight = (typeof p.weight_g === "number") ? `${p.weight_g} g` : "";

    return `
      <article class="card">
        <div class="cardTop">
          <div class="thumb">${thumb}</div>
          <div>
            <h2 class="cardTitle">${escapeHtml(p.brand)} ${escapeHtml(p.model)}</h2>
            <div class="price">${escapeHtml(price)}</div>
          </div>
        </div>

        <div class="highlights">
          <div><b>Warranty:</b> ${escapeHtml(warranty)}</div>
          <div><b>Value:</b> ${escapeHtml(vfm)}</div>
          <div><b>Weight:</b> ${escapeHtml(weight)}</div>
          ${staff && p.staff_notes ? `<div><b>Staff:</b> ${escapeHtml(p.staff_notes)}</div>` : ""}
        </div>

        <div class="pills">
          ${bestFor.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("")}
        </div>

        <div class="cardActions">
          <a class="btn secondary" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
          <label class="compareCheck">
            <input type="checkbox" data-id="${escapeHtml(p.id)}" ${selected ? "checked" : ""}>
            Compare
          </label>
        </div>
      </article>
    `;
  }).join("");

  // Wire compare checkboxes
  grid.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-id");
      toggleCompare(id, e.target.checked);
      // If we didn't navigate away, re-render tray and list to reflect state.
      renderTray();
      render();
    });
  });

  renderTray();
}

async function init(){
  category = getCategoryFromUrl();
  titleEl.textContent = categoryLabel(category);

  // Reset search each entry (kiosk behaviour)
  searchEl.value = "";

  // Staff toggle
  modeToggle.checked = isStaffMode();
  modeToggle.addEventListener("change", () => {
    setStaffMode(modeToggle.checked);
    render();
  });

  clearCompareBtn.addEventListener("click", () => {
    setCompareIds([]);
    renderTray();
    render();
  });

  goCompareBtn.addEventListener("click", () => {
    window.location.href = "compare.html";
  });

  searchEl.addEventListener("input", render);

  statusEl.textContent = "Loading…";
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load product data");
  products = await res.json();

  render();
}

init().catch(err => {
  console.error(err);
  statusEl.textContent = "Could not load products.";
});
