// js/compare.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";

  const els = {
    info: document.getElementById("compareInfo"),
    wrap: document.getElementById("compareWrap"),
    backToBrowse: document.getElementById("backToBrowse"),
  };

  // Clear compare as soon as you leave Compare screen (kiosk behaviour)
  window.addEventListener("pagehide", () => {
    try { localStorage.removeItem(STORAGE_COMPARE); } catch {}
  });

  // ---------------------------
  // Spec key merging / labels
  // ---------------------------
  const SPEC_ALIASES = {
    "close focus": [
      "close focus",
      "close focus (m)",
      "close focus distance",
      "close focus distance (m)",
      "close_focus",
      "close_focus_m",
      "close focus distance m",
    ],
    "nitrogen filled": [
      "nitrogen filled",
      "nitrogen-filled",
      "nitrogen fill",
      "nitrogen_fill",
      "nitrogen",
    ],
    "dimensions": [
      "dimensions",
      "dimension",
      "dimensions (mm)",
      "dimensions mm",
      "dimensions_mm",
      "size",
      "size mm",
      "dimensions l x w x h (mm)",
      "dimensions l × w × h (mm)",
      "dimensions l x w x h mm",
      "dimensions l×w×h (mm)",
    ],
    "objective (mm)": [
      "objective (mm)",
      "objective",
      "objective lens diameter (mm)",
      "objective lens diameter",
      "objective_diameter_mm",
      "objective diameter (mm)",
    ],
    "weight (g)": [
      "weight (g)",
      "weight",
      "weight_g",
      "weight grams",
    ],
    "magnification": [
      "magnification",
      "mag",
      "power",
    ],
    "warranty": [
      "warranty",
      "warranty (years)",
    ],
    "brand": ["brand"],
    "model": ["model"],
  };

  const SPEC_LABELS = {
    "close focus": "Close focus (m)",
    "nitrogen filled": "Nitrogen filled",
    "dimensions": "Dimensions (L × W × H mm)",
  };

  // We show these in "base fields", so don't repeat them from specs
  const HIDE_FROM_SPECS = new Set([
    "brand",
    "model",
    "magnification",
    "objective (mm)",
    "weight (g)",
    "warranty",
  ]);

  function cleanKey(k) {
    return String(k || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normaliseSpecKey(key) {
    const c = cleanKey(key);
    for (const canonical of Object.keys(SPEC_ALIASES)) {
      if (SPEC_ALIASES[canonical].includes(c)) return canonical;
    }
    return c;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeImg(src) {
    return src ? encodeURI(src) : "";
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

  function productName(p) {
    return (p.name || `${p.brand || ""} ${p.model || ""}`).trim();
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

  function renderEmpty(msg) {
    if (!els.wrap) return;
    els.wrap.innerHTML = `
      <div class="card error" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;">Compare</h3>
        <div class="muted">${escapeHtml(msg)}</div>
      </div>
    `;
  }

  // ---------------------------
  // Value normalisation
  // ---------------------------
  function normaliseValueForKey(key, value) {
    const v = String(value ?? "").trim();
    if (!v) return "";

    // Close focus: strip "m" and keep number if possible
    if (key === "close focus") {
      const cleaned = v.replace(/m\b/i, "").trim();
      const num = Number(cleaned);
      return Number.isFinite(num) ? String(num) : cleaned;
    }

    // Dimensions: keep as-is, but remove leading "L/W/H" clutter a bit
    if (key === "dimensions") {
      // examples: "L125 x W120", "120 x 120 x 50", "L125 x W120 x H50"
      return v
        .replace(/^\s*dimensions\s*[:\-]\s*/i, "")
        .replace(/\bL\s*/gi, "")
        .replace(/\bW\s*/gi, "")
        .replace(/\bH\s*/gi, "")
        .replace(/×/g, "x")
        .replace(/\s*x\s*/gi, " x ")
        .trim();
    }

    // Magnification: prefer "8x" style
    if (key === "magnification") {
      const m = v.replace(/\s+/g, "").toLowerCase();
      if (/^\d+(\.\d+)?x$/.test(m)) return m;
      const num = Number(v);
      if (Number.isFinite(num)) return `${num}x`;
      return v;
    }

    return v;
  }

  function normaliseSpecs(specsLike) {
    const raw = {};

    if (Array.isArray(specsLike)) {
      for (const r of specsLike) {
        const k = (r?.label ?? r?.name ?? r?.key ?? "").toString().trim();
        const v = r?.value ?? r?.val ?? r?.v ?? "";
        if (k) raw[k] = v;
      }
    } else if (specsLike && typeof specsLike === "object") {
      Object.assign(raw, specsLike);
    }

    const merged = {};
    for (const [k, v] of Object.entries(raw)) {
      const nk = normaliseSpecKey(k);
      if (!nk) continue;

      const vv = normaliseValueForKey(nk, v);
      if (!vv) continue;

      // Keep first non-empty
      if (!merged[nk]) merged[nk] = vv;
    }

    return merged;
  }

  // ---------------------------
  // UI building
  // ---------------------------
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
    // Base fields (shown first)
    const baseRows = [
      ["Brand", (p) => p.brand || ""],
      ["Model", (p) => p.model || ""],
      ["Magnification", (p) => (p.magnification || "").toString().replace(/\s+/g, "")],
      ["Objective (mm)", (p) => p.objective_diameter_mm ?? ""],
      ["Weight (g)", (p) => p.weight_g ?? ""],
      ["Warranty", (p) => p.warranty || ""],
    ];

    const specMaps = products.map(p =>
      normaliseSpecs(p.specs || p.specifications || p.full_specs || p.spec_sheet || p.spec_sheet_data)
    );

    const specKeySet = new Set();
    specMaps.forEach(m => Object.keys(m).forEach(k => specKeySet.add(k)));

    // Remove anything that's already in base fields
    const allSpecKeys = Array.from(specKeySet).filter(k => !HIDE_FROM_SPECS.has(k));

    // Sort: key ones first
    const preferredOrder = ["close focus", "dimensions", "nitrogen filled"];
    allSpecKeys.sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const specRows = allSpecKeys.map(k => [
      k,
      (_p, idx) => specMaps[idx]?.[k] || "",
    ]);

    const rows = [
      ...baseRows,
      ["", () => ""], // spacer
      ...specRows,
    ];

    return `
      <div class="compare-table">
        <div class="compare-row compare-head compare-2">
          <div class="compare-cell compare-key">Spec</div>
          ${products.map(p => `<div class="compare-cell compare-val">${escapeHtml(productName(p))}</div>`).join("")}
        </div>

        ${rows.map(([labelOrKey, getter]) => {
          if (labelOrKey === "") {
            return `<div class="compare-row compare-spacer compare-2"></div>`;
          }

          const displayLabel = SPEC_LABELS[labelOrKey] || labelOrKey;

          const vals = products.map((p, idx) => {
            const v = typeof getter === "function" ? getter(p, idx) : "";
            return v === null || v === undefined ? "" : String(v);
          });

          // Hide rows where both values are empty
          if (!vals.some(v => v.trim() !== "")) return "";

          return `
            <div class="compare-row compare-2">
              <div class="compare-cell compare-key">${escapeHtml(displayLabel)}</div>
              ${vals.map(v => `<div class="compare-cell compare-val">${escapeHtml(v)}</div>`).join("")}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function wireRemoveButtons() {
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = String(btn.getAttribute("data-remove"));
        const ids = getCompareIds().filter(x => String(x) !== id);
        setCompareIds(ids);
        init();
      });
    });
  }

  async function init() {
    if (!els.wrap) return;

    let ids = getCompareIds();

    if (ids.length < 2) {
      renderEmpty("Add exactly 2 products using “Add to compare” on the browse page.");
      if (els.info) els.info.textContent = "";
      return;
    }

    // Enforce 2 only
    if (ids.length > 2) {
      ids = ids.slice(0, 2);
      setCompareIds(ids);
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
        renderEmpty("One of your compare items no longer exists. Remove it and try again.");
        return;
      }

      // Same category only
      const catSet = new Set(selected.map(p => slug(p.category)));
      if (catSet.size > 1) {
        renderEmpty("Items must be in the same category to compare. Remove one item to continue.");
        if (els.info) els.info.textContent = "Selected: 2 (must be same category)";
        return;
      }

      const cat = Array.from(catSet)[0] || "binoculars";
      if (els.backToBrowse) {
        els.backToBrowse.href = `browse.html?category=${encodeURIComponent(cat)}`;
      }

      if (els.info) els.info.textContent = "Comparing 2 items";

      els.wrap.innerHTML = buildTopCards(selected) + buildCompareTable(selected);
      wireRemoveButtons();
    } catch (err) {
      console.error(err);
      renderEmpty("Could not load product data. Check data/products.json.");
    }
  }

  init();
})();
