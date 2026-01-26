// js/product.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";
  const STORAGE_REWARDS = "rspb_rewards_show";

  const POINTS_PER_POUND_NORMAL = 2;
  const POINTS_PER_POUND_DOUBLE = 4;
  const POINTS_TO_POUNDS = 0.01; // 100 points = £1

  const productEl = document.getElementById("product");
  const compareCountEl = document.getElementById("compareCount");

  function getParam(name) {
    return new URL(window.location.href).searchParams.get(name) || "";
  }

  function formatGBP(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(num);
  }

  function safeImgSrc(src) {
    return src ? encodeURI(src) : "";
  }

  function placeholder(label = "No image") {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.25)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="rgba(255,255,255,0.7)" font-size="36"
          font-family="system-ui,Segoe UI,Arial">
          ${label}
        </text>
      </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function getCompareIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_COMPARE)) || [];
    } catch {
      return [];
    }
  }

  function setCompareIds(ids) {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(ids));
  }

  function updateCompareCount() {
    if (compareCountEl) {
      compareCountEl.textContent = String(getCompareIds().length);
    }
  }

  function getRewardsShown() {
    return localStorage.getItem(STORAGE_REWARDS) === "true";
  }

  function setRewardsShown(v) {
    localStorage.setItem(STORAGE_REWARDS, v ? "true" : "false");
  }

  function calcRewards(price) {
    const p = Number(price) || 0;
    const normalPoints = Math.round(p * POINTS_PER_POUND_NORMAL);
    const doublePoints = Math.round(p * POINTS_PER_POUND_DOUBLE);
    return {
      normalPoints,
      normalValue: normalPoints * POINTS_TO_POUNDS,
      doublePoints,
      doubleValue: doublePoints * POINTS_TO_POUNDS,
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function specRows(specs) {
    if (!specs || typeof specs !== "object") return [];
    return Object.entries(specs)
      .filter(([_, v]) => v !== null && v !== "")
      .map(([k, v]) => ({ k, v }));
  }

  function renderSpecs(rows) {
    if (!rows.length) return `<div class="muted">No specifications listed.</div>`;
    return `
      <div class="specs-grid">
        ${rows.map(r => `
          <div class="spec-row">
            <div class="spec-label">${escapeHtml(r.k)}</div>
            <div class="spec-value">${escapeHtml(r.v)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function render(product) {
    const id = String(product.id);
    const name = product.name || `${product.brand} ${product.model}`;
    const img = safeImgSrc(product.image) || placeholder();
    const price = formatGBP(product.price_gbp);

    const compareIds = getCompareIds();
    const inCompare = compareIds.includes(id);

    const rewards = calcRewards(product.price_gbp);
    const rewardsShown = getRewardsShown();

    productEl.innerHTML = `
      <div class="product-hero">
        <div class="product-img">
          <img src="${img}" alt="${escapeHtml(name)}"
               onerror="this.src='${placeholder("Image missing")}'">
        </div>

        <div class="product-head">
          <h1 class="product-title">${escapeHtml(name)}</h1>
          ${price ? `<div class="product-price">${price}</div>` : ""}

          <div class="product-controls">
            <label class="compare-toggle">
              <input type="checkbox" id="compareToggle" ${inCompare ? "checked" : ""}>
              <span>Add to compare</span>
            </label>

            <label class="toggle">
              <input type="checkbox" id="rewardsToggle" ${rewardsShown ? "checked" : ""}>
              <span>Show rewards value</span>
            </label>
          </div>

          <div id="rewardsBlock" class="rewards"
               style="display:${rewardsShown ? "block" : "none"}">
            <div><strong>Normal:</strong> ${rewards.normalPoints} pts (${formatGBP(rewards.normalValue)})</div>
            <div><strong>Optics weekend:</strong> ${rewards.doublePoints} pts (${formatGBP(rewards.doubleValue)})</div>
          </div>
        </div>
      </div>

      <!-- DESCRIPTION -->
      ${product.description ? `
        <div class="section">
          <h3>Description</h3>
          <p class="desc">${escapeHtml(product.description)}</p>
        </div>
      ` : ""}

      <!-- KEY FEATURES -->
      ${Array.isArray(product.key_features) && product.key_features.length ? `
        <div class="section">
          <h3>Key features</h3>
          <ul class="bullets">
            ${product.key_features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      <!-- SPECIFICATIONS -->
      <div class="section">
        <h3>Specifications</h3>
        ${renderSpecs(specRows(product.specs))}
      </div>
    `;

    // Compare toggle
    document.getElementById("compareToggle")?.addEventListener("change", e => {
      const ids = getCompareIds();
      if (e.target.checked && !ids.includes(id)) ids.push(id);
      if (!e.target.checked && ids.includes(id)) ids.splice(ids.indexOf(id), 1);
      setCompareIds(ids);
      updateCompareCount();
    });

    // Rewards toggle
    document.getElementById("rewardsToggle")?.addEventListener("change", e => {
      setRewardsShown(e.target.checked);
      document.getElementById("rewardsBlock").style.display =
        e.target.checked ? "block" : "none";
    });

    updateCompareCount();
  }

  async function init() {
    if (!productEl) return;

    const id = getParam("id");
    if (!id) {
      productEl.innerHTML = `<div class="card error">Missing product ID</div>`;
      return;
    }

    try {
      const res = await fetch("data/products.json", { cache: "no-store" });
      const data = await res.json();
      const product = data.find(p => String(p.id) === String(id));

      if (!product) {
        productEl.innerHTML = `<div class="card error">Product not found</div>`;
        return;
      }

      render(product);
    } catch {
      productEl.innerHTML = `<div class="card error">Could not load product data</div>`;
    }
  }

  init();
})();
