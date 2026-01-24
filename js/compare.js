// js/compare.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";

  const els = {
    info: document.getElementById("compareInfo"),
    wrap: document.getElementById("compareWrap"),
    backToBrowse: document.getElementById("backToBrowse"),

  const SPEC_ALIASES = {
  "close focus": ["close focus", "close focus (m)", "close_focus", "close_focus_m"],
  "nitrogen filled": ["nitrogen filled", "nitrogen-filled", "nitrogen"],
  "dimensions": ["dimensions", "dimensions mm", "dimensions_mm"],
};

  };

  function getCompareIds() {
    try {
      const raw = localStorage.getItem(STORAGE_COMPARE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }

function normaliseSpecKey(key) {
  const clean = key.toLowerCase().replace(/[_-]/g, " ").trim();

  for (const canonical in SPEC_ALIASES) {
    if (SPEC_ALIASES[canonical].includes(clean)) {
      return canonical;
    }
  }

function normaliseSpecs(specs) {
  const result = {};

  for (const [key, value] of Object.entries(specs || {})) {
    const normalKey = normaliseSpecKey(key);

    if (value && !result[normalKey]) {
      result[normalKey] = value;
    }
  }

  return result;
}

  
  return clean;
}


  function setCompareIds(ids) {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(ids.map(String)));
  }

  function safeImg(src) {
    return src ? encodeURI(src) : "";
  }

  function formatGBP(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normaliseSpecs(specs) {
    // Supports: object {k:v} OR array [{label,value}]
    if (!specs) return {};
    if (Array.isArray(specs)) {
      const o = {};
      specs.forEach(r => {
        const k = (r?.label ?? r?.name ?? "").toString().trim();
        const v = (r?.value ?? r?.val ?? "").toString().trim();
        if (k && v) o[k] = v;
      });
      return o;
    }
    if (typeof specs === "object") {
      const o = {};
      Object.entries(specs).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        const vv = String(v).trim();
        if (!vv) return;
        o[String(k).trim()] = vv;
      });
      return o;
    }
    return {};
  }

  function productName(p) {
    return (p.name || `${p.brand || ""} ${p.model || ""}`).trim();
  }

  function buildTopCards(products) {
    return `
      <div class="compare-top">
        ${products.map(p => `
          <div class="compare-card">
            <div class="compare-thumb">
              <img src="${safeImg(p.image)}" alt="${escapeHtml(productName(p))}">
            </div>
            <div class="compare-title">${escapeHtml(productName(p))}</div>
            <div class="compare-price">${escapeHtml(formatGBP(p.price_gbp))}</div>

            <div class="compare-actions">
              <a class="btn" href="product.html?id=${encodeURIComponent(String(p.id))}">View details</a>
              <button class="btn ghost" data-remove="${escapeHtml(String(p.id))}">Remove</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildCompareTable(products) {
    const baseRows = [
      ["Brand", p => p.brand],
      ["Model", p => p.model],
      ["Magnification", p => p.magnification],
      ["Objective (mm)", p => p.objective_diameter_mm],
      ["Field of view", p => p.field_of_view],
      ["Close focus", p => p.close_focus_distance],
      ["Eye relief", p => p.eye_relief],
      ["Weight (g)", p => (p.weight_g ?? "") !== "" ? `${p.weight_g}` : ""],
      ["Warranty", p => p.warranty],
    ];

    // Merge all specs keys across products
    const specMaps = products.map(p => normaliseSpecs(p.specs || p.specifications || p.full_specs));
    const specKeys = new Set();
    specMaps.forEach(m => Object.keys(m).forEach(k => specKeys.add(k)));

    const specRows = Array.from(specKeys).sort().map(k => [
      k,
      (p, idx) => specMaps[idx]?.[k] || ""
    ]);

    const allRows = [
      ...baseRows,
      ["", () => ""], // spacer
      ...specRows
    ];

    return `
      <div class="compare-table">
        <div class="compare-row compare-head">
          <div class="compare-cell compare-key">Spec</div>
          ${products.map(p => `<div class="compare-cell compare-val">${escapeHtml(productName(p))}</div>`).join("")}
        </div>

        ${allRows.map(([label, getter]) => {
          // spacer row
          if (label === "") {
            return `<div class="compare-row compare-spacer"></div>`;
          }

          const vals = products.map((p, idx) => {
            const v = typeof getter === "function" ? getter(p, idx) : "";
            return (v === null || v === undefined) ? "" : String(v);
          });

          // hide rows where everything is empty
          const any = vals.some(v => v.trim() !== "");
          if (!any) return "";

          return `
            <div class="compare-row">
              <div class="compare-cell compare-key">${escapeHtml(label)}</div>
              ${vals.map(v => `<div class="compare-cell compare-val">${escapeHtml(v)}</div>`).join("")}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderEmpty(msg) {
    els.wrap.innerHTML = `
      <div class="card error" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;">Compare</h3>
        <div class="muted">${escapeHtml(msg)}</div>
      </div>
    `;
  }

  function renderDifferentCategories(products) {
    const cats = Array.from(new Set(products.map(p => (p.category || "").toLowerCase())));
    renderEmpty(`Items must be in the same category to compare. You currently have: ${cats.join(", ")}. Remove one item to continue.`);
  }

  function wireRemoveButtons() {
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = String(btn.getAttribute("data-remove"));
        const ids = getCompareIds().filter(x => String(x) !== id);
        setCompareIds(ids);
        init(); // re-render
      });
    });
  }

  async function init() {
    const ids = getCompareIds();

    if (ids.length < 2) {
      renderEmpty("Add at least 2 products using “Add to compare” on the browse page.");
      if (els.info) els.info.textContent = "";
      return;
    }

    try {
      const res = await fetch("data/products.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load products.json");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("products.json is not an array");

      const selected = ids
        .map(id => data.find(p => String(p.id) === String(id)))
        .filter(Boolean);

      if (selected.length < 2) {
        renderEmpty("Your compare list includes items that no longer exist. Clear compare and try again.");
        return;
      }

      // Enforce same category only
      const catSet = new Set(selected.map(p => (p.category || "").toLowerCase()));
      if (catSet.size > 1) {
        renderDifferentCategories(selected);
        if (els.info) els.info.textContent = `Selected: ${selected.length} (must be same category)`;
        return;
      }

      // update back-to-browse to the right category
      const cat = Array.from(catSet)[0] || "binoculars";
      if (els.backToBrowse) els.backToBrowse.href = `browse.html?category=${encodeURIComponent(cat)}`;

      if (els.info) els.info.textContent = `${selected.length} item(s) selected`;

      els.wrap.innerHTML =
        buildTopCards(selected) +
        buildCompareTable(selected);

      wireRemoveButtons();
    } catch (err) {
      console.error(err);
      renderEmpty("Could not load product data. Check data/products.json.");
    }
  }

  init();
})();
