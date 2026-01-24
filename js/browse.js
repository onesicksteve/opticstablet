// js/browse.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";
  const STORAGE_REWARDS = "rspb_rewards_show";

  // Rewards rules
  const POINTS_PER_POUND_NORMAL = 2;
  const POINTS_PER_POUND_DOUBLE = 4;
  const POINTS_TO_POUNDS = 0.01; // 100 points = £1

  const els = {
    pageTitle: document.getElementById("pageTitle"),
    rewardsToggle: document.getElementById("rewardsToggle"),
    searchInput: document.getElementById("searchInput"),
    itemCount: document.getElementById("itemCount"),
    compareCount: document.getElementById("compareCount"),
    grid: document.getElementById("grid"),
  };

  // Fail fast if the page is missing required IDs
  if (!els.grid || !els.searchInput || !els.itemCount) {
    console.error("browse.html is missing required elements (grid/searchInput/itemCount).");
    return;
  }

  function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
  }

  function titleCase(s) {
    return (s || "")
      .replace(/-/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function slug(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatGBP(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(num);
    } catch {
      return "£" + num.toFixed(2);
    }
  }

  function safeImgSrc(src) {
    // products.json uses "Images/..." with spaces — encode spaces safely
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
      if (!Array.isArray(arr)) return [];
      // normalize to strings
      return arr.map(String);
    } catch {
      return [];
    }
  }

  function setCompareIds(ids) {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(ids.map(String)));
  }

  function updateCompareCount() {
    if (!els.compareCount) return;
    els.compareCount.textContent = String(getCompareIds().length);
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

  // Determine category from URL (supports both legacy cat= and current category=)
  const categoryRaw = getParam("category") || getParam("cat") || "binoculars";
  const categoryKey = slug(categoryRaw);

  if (els.pageTitle) {
    els.pageTitle.textContent = `Browse ${titleCase(categoryRaw)}`;
  }

  let allProducts = [];

  function matchesCategory(p) {
    return slug(p.category) === categoryKey;
  }

  function matchesQuery(p, q) {
    if (!q) return true;
    const hay = [
      p.name,
      p.brand,
      p.model,
      p.magnification,
      p.objective_diameter_mm,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  }

  function bestForChips(bestFor) {
    const arr = Array.isArray(bestFor) ? bestFor : [];
    if (!arr.length) return "";
    return `
      <div class="chips">
        ${arr.slice(0, 3).map(t => `<span class="chip">${t}</span>`).join("")}
      </div>
    `;
  }

  function buildCard(p, rewardsShown) {
    const compareIds = getCompareIds();
    const pid = String(p.id);
    const checked = compareIds.includes(pid);

    const img = safeImgSrc(p.image) || placeholderDataUri("No image");
    const name = p.name || `${p.brand || ""} ${p.model || ""}`.trim();
    const price = formatGBP(p.price_gbp);

    const valueLine = p.value_for_money ? `<div class="subline">${p.value_for_money}</div>` : "";
    const weightLine = p.weight_g ? `<div class="meta"><span>Weight</span><span>${p.weight_g} g</span></div>` : "";
    const warrantyLine = p.warranty ? `<div class="meta"><span>Warranty</span><span>${p.warranty}</span></div>` : "";

    const rewards = calcRewards(p.price_gbp);
    const rewardsBlock = rewardsShown
      ? `
        <div class="rewards">
          <div><strong>Normal:</strong> ${rewards.normalPoints} pts (${formatGBP(rewards.normalValue)})</div>
          <div><strong>Optics weekend:</strong> ${rewards.doublePoints} pts (${formatGBP(rewards.doubleValue)})</div>
        </div>
      `
      : "";

    const missingImg = placeholderDataUri("Image missing");

    return `
      <article class="card">
        <div class="card-image">
          <img
            src="${img}"
            alt="${name.replace(/"/g, "&quot;")}"
            loading="lazy"
            onerror="this.onerror=null;this.src='${missingImg}';"
          />
        </div>

        <div class="card-body">
          <h3 class="card-title">${name}</h3>
          <div class="price">${price}</div>
          ${valueLine}

          ${bestForChips(p.best_for)}

          <div class="meta-grid">
            ${warrantyLine}
            ${weightLine}
          </div>

          ${rewardsBlock}

          <div class="card-actions">
            <a class="btn" href="product.html?id=${encodeURIComponent(pid)}">View details</a>

            <label class="compare-toggle">
              <input type="checkbox" data-compare-id="${pid}" ${checked ? "checked" : ""}>
              <span>Add to compare</span>
            </label>
          </div>
        </div>
      </article>
    `;
  }

  function wireCompareToggles() {
    document.querySelectorAll('input[type="checkbox"][data-compare-id]').forEach(cb => {
      cb.addEventListener("change", (e) => {
        const id = String(e.target.getAttribute("data-compare-id"));
        const ids = getCompareIds();

        if (e.target.checked) {
          if (!ids.includes(id)) ids.push(id);
        } else {
          const idx = ids.indexOf(id);
          if (idx >= 0) ids.splice(idx, 1);
        }

        setCompareIds(ids);
        updateCompareCount();
      });
    });
  }

  function render() {
    const q = (els.searchInput.value || "").trim().toLowerCase();
    const rewardsShown = !!els.rewardsToggle?.checked;

    const filtered = allProducts
      .filter(matchesCategory)
      .filter(p => matchesQuery(p, q));

    els.itemCount.textContent = String(filtered.length);

    els.grid.innerHTML = filtered.map(p => buildCard(p, rewardsShown)).join("");
    wireCompareToggles();
    updateCompareCount();
  }

  async function init() {
    // Restore toggle state
    if (els.rewardsToggle) {
      els.rewardsToggle.checked = getRewardsShown();
      els.rewardsToggle.addEventListener("change", () => {
        setRewardsShown(els.rewardsToggle.checked);
        render();
      });
    }

    els.searchInput.addEventListener("input", () => render());

    updateCompareCount();

    try {
      const res = await fetch("data/products.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load data/products.json");
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error("products.json is not an array");
      allProducts = data;

      render();
    } catch (err) {
      console.error(err);
      els.grid.innerHTML = `
        <div class="card error">
          <h3>Could not load products</h3>
          <p>Check that <code>data/products.json</code> exists and is valid JSON.</p>
        </div>
      `;
    }
  }

  init();
})();
