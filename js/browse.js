const STORAGE_KEY = "rspb_compare_ids";
const REWARDS_KEY = "rspb_rewards_mode"; // boolean
const POINTS_PER_POUND_NORMAL = 2;
const POINTS_PER_POUND_DOUBLE = 4;

function getCompareIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function setCompareIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
function addToCompare(id) {
  const ids = getCompareIds();
  if (!ids.includes(id)) ids.push(id);
  setCompareIds(ids);
  return ids;
}
function removeFromCompare(id) {
  const ids = getCompareIds().filter(x => x !== id);
  setCompareIds(ids);
  return ids;
}
function getRewardsMode() {
  return localStorage.getItem(REWARDS_KEY) === "true";
}
function setRewardsMode(v) {
  localStorage.setItem(REWARDS_KEY, v ? "true" : "false");
}

function formatGBP(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
  } catch {
    return "£" + num.toFixed(2);
  }
}

function calcRewards(priceGbp) {
  const pounds = Number(priceGbp) || 0;
  const normalPoints = Math.round(pounds * POINTS_PER_POUND_NORMAL);
  const doublePoints = Math.round(pounds * POINTS_PER_POUND_DOUBLE);
  return {
    normalPoints,
    normalValue: normalPoints * 0.01,
    doublePoints,
    doubleValue: doublePoints * 0.01
  };
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load " + path);
  return await res.json();
}

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) || "";
}

function slugify(val) {
  return (val ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setComparePill() {
  const countEl = document.getElementById("compareCount");
  if (!countEl) return;
  countEl.textContent = String(getCompareIds().length);
}

// Handles either:
//  - "avocet 8x32.jpg"
//  - "Images/avocet 8x32.jpg"
function resolveImagePath(imageVal) {
  if (!imageVal) return "";
  const s = String(imageVal);
  if (s.includes("/")) return s;          // already has a folder
  return `Images/${s}`;                    // filename only
}

function productCard(p, rewardsOn) {
  const name = p.name || `${p.brand || ""} ${p.model || ""}`.trim();
  const price = p.price_gbp;
  const value = p.value_for_money || "";
  const weight = (p.weight_g != null) ? `${p.weight_g} g` : (p.weight || "");
  const tags = (p.best_for || []).slice(0, 3);

  const imgSrc = resolveImagePath(p.image);
  const rewards = calcRewards(price);

  const rewardsHtml = rewardsOn ? `
    <div class="rewards">
      <div><strong>Normal:</strong> ${rewards.normalPoints} pts (${formatGBP(rewards.normalValue)})</div>
      <div><strong>Optics weekend:</strong> ${rewards.doublePoints} pts (${formatGBP(rewards.doubleValue)})</div>
    </div>
  ` : "";

  const checked = getCompareIds().includes(p.id) ? "checked" : "";

  return `
    <section class="card product-card">
      ${imgSrc ? `<img class="thumb" src="${imgSrc}" alt="${name}" onerror="this.style.display='none'" />` : ""}
      <div>
        <h2 class="title">${name}</h2>
        <div class="price">${formatGBP(price)}</div>

        <div class="kv">
          <div><strong>Warranty:</strong> ${p.warranty || ""}</div>
          <div><strong>Value:</strong> ${value}</div>
          <div><strong>Weight:</strong> ${weight}</div>
        </div>

        <div class="tag-row">
          ${tags.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>

        ${rewardsHtml}

        <div class="actions">
          <a class="btn ghost" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
          <label class="toggle" style="color:var(--text);font-weight:650">
            <input type="checkbox" data-compare-id="${p.id}" ${checked} />
            <span>Compare</span>
          </label>
        </div>
      </div>
    </section>
  `;
}

function wireCompareCheckboxes() {
  document.querySelectorAll("input[data-compare-id]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-compare-id");
      if (e.target.checked) addToCompare(id);
      else removeFromCompare(id);
      setComparePill();
    });
  });
}

(async function init() {
  const catRaw = getParam("cat") || "binoculars";
  const catSlug = slugify(catRaw);

  const pageTitleEl = document.getElementById("pageTitle");
  if (pageTitleEl) {
    const titleText = catRaw.toString().trim().replace(/-/g, " ") || "binoculars";
    pageTitleEl.textContent = `Browse ${titleText.toLowerCase()}`;
  }

  const rewardsToggle = document.getElementById("rewardsToggle");
  const searchInput = document.getElementById("searchInput");
  const grid = document.getElementById("grid");
  const itemCount = document.getElementById("itemCount");

  if (!grid || !searchInput || !itemCount) {
    console.error("browse.html is missing required IDs (grid/searchInput/itemCount).");
    return;
  }

  let all = [];
  try {
    all = await loadJSON("data/products.json");
  } catch (e) {
    grid.innerHTML = `<section class="card">Could not load data/products.json</section>`;
    console.error(e);
    return;
  }

  function render() {
    setComparePill();

    const q = (searchInput.value || "").trim().toLowerCase();
    const rewardsOn = rewardsToggle ? rewardsToggle.checked : false;

    const filtered = all
      .filter(p => slugify(p.category) === catSlug)
      .filter(p =>
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.model || "").toLowerCase().includes(q)
      );

    itemCount.textContent = `${filtered.length} item(s)`;
    grid.innerHTML = filtered.map(p => productCard(p, rewardsOn)).join("");
    wireCompareCheckboxes();
  }

  if (rewardsToggle) {
    rewardsToggle.checked = getRewardsMode();
    rewardsToggle.addEventListener("change", () => {
      setRewardsMode(rewardsToggle.checked);
      render();
    });
  }

  searchInput.addEventListener("input", () => render());

  render();
})();
