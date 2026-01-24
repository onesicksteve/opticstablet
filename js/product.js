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
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
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

  function safeImgSrc(src) {
    if (!src) return "";
    return encodeURI(src);
  }

  function placeholderDataUri(label = "No image") {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.25)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="rgba(255,255,255,0.7)" font-family="system-ui,Segoe UI,Arial" font-size="36">
          ${label}
        </text>
      </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function getCompareIds() {
    try {
      const raw = localStorage.getItem(STORAGE_COMPARE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }

  function setCompareIds(ids) {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(ids.map(String)));
  }

  function updateCompareCount() {
    if (!compareCountEl) return;
    compareCountEl.textContent = String(getCompareIds().length);
  }

  function getRewardsShown() {
    return localStorage.getItem(STORAGE_REWARDS) === "true";
  }

  function setRewardsShown(v) {
    localStorage.setItem(STORAGE_REWARDS, v ? "true" : "false");
  }

  function calcRewards(priceGbp) {
    const price = Number(priceGbp) || 0;
    const normalPoints = Math.round(price * POINTS_PER_POUND_NORMAL);
    const doublePoints = Math.round(price * POINTS_PER_POUND_DOUBLE);
    return {
      normalPoints,
      normalValue: normalPoints * POINTS_TO_POUNDS,
      doublePoints,
      doubleValue: doublePoints * POINTS_TO_POUNDS,
    };
  }

  function toSpecRows(specs) {
    if (!specs || typeof specs !== "object") return [];
    // If specs is array of {label,value} or object {label:value}, support both
    if (Array.isArray(specs)) {
      return specs
        .filter(r => r && (r.label || r.name) && (r.value ?? r.val ?? "") !== "")
        .map(r => ({ k: String(r.label || r.name), v: String(r.value ?? r.val ?? "") }));
    }
    return Object.entries(specs)
      .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => ({ k: String(k), v: String(v) }));
  }

  function renderSpecsTable(rows) {
    if (!rows.length) return `<div class="muted">No specs listed.</div>`;

    return `
      <div class="specs">
        ${rows.map(r => `
          <div class="spec-row">
            <div class="spec-k">${escapeHtml(r.k)}</div>
            <div class="spec-v">${escapeHtml(r.v)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderList(title, items) {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return "";
    return `
      <div class="section">
        <h3>${escapeHtml(title)}</h3>
        <ul class="bullets">
          ${arr.map(x => `<li>${escapeHtml(String(x))}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render(product) {
    const pid = String(product.id);
    const name = product.name || `${product.brand || ""} ${product.model || ""}`.trim();
    const img = safeImgSrc(product.image) || placeholderDataUri("No image");
    const price = formatGBP(product.price_gbp);

    const compareIds = getCompareIds();
    const inCompare = compareIds.includes(pid);

    const bestFor = Array.isArray(product.best_for) ? product.best_for : [];
    const description = product.description ? String(product.description).trim() : "";
    const features = Array.isArray(product.key_features) ? product.key_features : (Array.isArray(product.features) ? product.features : []);
    const specsRows = toSpecRows(product.specs || product.specifications || product.full_specs || {});

    const rewardsShown = getRewardsShown();
    const rewards = calcRewards(product.price_gbp);

    productEl.innerHTML = `
      <div class="product-hero">
        <div class="product-img">
          <img
            src="${img}"
            alt="${escapeHtml(name)}"
            onerror="this.onerror=null;this.src='${placeholderDataUri("Image missing")}';"
          />
        </div>

        <div class="product-head">
          <h1 class="product-title">${escapeHtml(name)}</h1>
          ${price ? `<div class="product-price">${price}</div>` : ""}

          ${bestFor.length ? `
            <div class="chips">
              ${bestFor.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}
            </div>
          ` : ""}

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

          <div id="rewardsBlock" class="rewards" style="display:${rewardsShown ? "block" : "none"}">
            <div><strong>Normal:</strong> ${rewards.normalPoints} pts (${formatGBP(rewards.normalValue)})</div>
            <div><strong>Optics weekend:</strong> ${rewards.doublePoints} pts (${formatGBP(rewards.doubleValue)})</div>
          </div>
        </div>
      </div>

      <!-- B ORDER: SPECS FIRST -->
      <div class="section">
        <h3>Specifications</h3>
        ${renderSpecsTable(specsRows)}
      </div>

      ${renderList("Key features", features)}

      ${description ? `
        <div class="section">
          <h3>Description</h3>
          <p class="desc">${escapeHtml(description)}</p>
        </div>
      ` : ""}
    `;

    // wire compare
    const compareToggle = document.getElementById("compareToggle");
    if (compareToggle) {
      compareToggle.addEventListener("change", () => {
        const ids = getCompareIds();
        const exists = ids.includes(pid);

        if (compareToggle.checked && !exists) ids.push(pid);
        if (!compareToggle.checked && exists) ids.splice(ids.indexOf(pid), 1);

        setCompareIds(ids);
        updateCompareCount();
      });
    }

    // wire rewards
    const rewardsToggle = document.getElementById("rewardsToggle");
    const rewardsBlock = document.getElementById("rewardsBlock");
    if (rewardsToggle && rewardsBlock) {
      rewardsToggle.addEventListener("change", () => {
        setRewardsShown(!!rewardsToggle.checked);
        rewardsBlock.style.display = rewardsToggle.checked ? "block" : "none";
      });
    }

    updateCompareCount();
  }

  async function init() {
    if (!productEl) return;

    const id = getParam("id").trim();
    if (!id) {
      productEl.innerHTML = `<div class="card error"><h3>Missing product ID</h3></div>`;
      return;
    }

    try {
      const res = await fetch("data/products.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load data/products.json");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("products.json is not an array");

      const product = data.find(p => String(p.id) === String(id));
      if (!product) {
        productEl.innerHTML = `<div class="card error"><h3>Product not found</h3><p>ID: <code>${escapeHtml(id)}</code></p></div>`;
        return;
      }

      render(product);
    } catch (err) {
      console.error(err);
      productEl.innerHTML = `
        <div class="card error">
          <h3>Could not load product</h3>
          <p>Check that <code>data/products.json</code> exists and is valid JSON.</p>
        </div>
      `;
    }
  }

  init();
})();
