// js/compare.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";
  const MAX_COMPARE = 2;
  const DATA_URL = "data/products.json";

  // you asked for this: clear compare when you leave compare screen
  const CLEAR_ON_LEAVE = true;

  // optional inactivity timeout back to home (minutes)
  const IDLE_MINUTES = 5;

  const els = {
    pageTitle: document.getElementById("pageTitle"),
    compareCount: document.getElementById("compareCount"),
    wrap:
      document.getElementById("compareTable") ||
      document.getElementById("compare") ||
      document.getElementById("content") ||
      document.body,
  };

  // Ensure we have somewhere to render
  let tableHost = document.getElementById("compareTable");
  if (!tableHost) {
    tableHost = document.createElement("div");
    tableHost.id = "compareTable";
    els.wrap.appendChild(tableHost);
  }

  function safeText(s) {
    return String(s ?? "").trim();
  }

  function encodeHtml(s) {
    return safeText(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function titleCase(s) {
    return safeText(s)
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getCompareIds() {
    try {
      const raw = localStorage.getItem(STORAGE_COMPARE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function setCompareIds(ids) {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(ids));
  }

  function clearCompare() {
    setCompareIds([]);
  }

  function updateCompareCount() {
    if (!els.compareCount) return;
    els.compareCount.textContent = String(getCompareIds().length);
  }

  // -----------------------------
  // Key normalisation (merge duplicates)
  // -----------------------------
  function normaliseKey(rawKey) {
    const k = safeText(rawKey).toLowerCase();

    if (k.includes("close focus")) return "close focus";
    if (k.includes("dimension")) return "dimensions";

    const k2 = k.replace(/-/g, " ");
    if (k2.includes("nitrogen filled")) return "nitrogen filled";

    if (k.includes("weight")) return "weight";
    if (k.includes("warranty")) return "warranty";

    if (k === "magnification") return "magnification";
    if (k.includes("objective") && k.includes("mm")) return "objective (mm)";
    if (k.includes("objective lens")) return "objective (mm)";

    if (k.includes("eye relief")) return "eye relief (mm)";
    if (k.includes("exit pupil")) return "exit pupil (mm)";
    if (k.includes("field of view") && k.includes("1000")) return "field of view (m/1000m)";
    if (k.includes("field of view") && k.includes("degree")) return "field of view (degrees)";

    if (k.includes("ed lens")) return "ed lens";
    if (k.includes("waterproof")) return "waterproof";

    return safeText(rawKey).toLowerCase();
  }

  function displayKey(key) {
    switch (key) {
      case "objective (mm)":
        return "Objective (mm)";
      case "eye relief (mm)":
        return "Eye relief (mm)";
      case "exit pupil (mm)":
        return "Exit pupil (mm)";
      case "field of view (degrees)":
        return "Field of view (degrees)";
      case "field of view (m/1000m)":
        return "Field of view (m/1000m)";
      case "close focus":
        return "Close focus (m)";
      case "dimensions":
        return "Dimensions (L × W × H mm)";
      case "nitrogen filled":
        return "Nitrogen filled";
      default:
        return titleCase(key);
    }
  }

  // -----------------------------
  // Value normalisation
  // -----------------------------
  function normaliseValueForKey(key, value) {
    const v = safeText(value);
    if (!v) return "";

    // Close focus -> "X m"
    if (key === "close focus") {
      let s = v.replace(/\s+/g, " ").trim();
      s = s.replace(/m\b/i, "").trim();
      const n = Number(s);
      if (Number.isFinite(n)) return `${n} m`;
      const m = s.match(/(\d+(\.\d+)?)/);
      return m ? `${m[1]} m` : v;
    }

    // Dimensions -> ALWAYS "L125 x W120 x H50"
    // If we only have 2 numbers, H becomes "—" (we cannot invent H)
    if (key === "dimensions") {
      let s = v
        .replace(/×/g, "x")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Try labelled L/W/H first
      let L = (s.match(/\bL\s*(\d+(\.\d+)?)/i) || [])[1];
      let W = (s.match(/\bW\s*(\d+(\.\d+)?)/i) || [])[1];
      let H = (s.match(/\bH\s*(\d+(\.\d+)?)/i) || [])[1];

      // Pull all numbers as fallback
      const nums = s.match(/(\d+(\.\d+)?)/g) || [];
      const n0 = nums[0];
      const n1 = nums[1];
      const n2 = nums[2];

      if (!L && n0) L = n0;
      if (!W && n1) W = n1;
      if (!H && n2) H = n2;

      return `L${L ?? "—"} x W${W ?? "—"} x H${H ?? "—"}`;
    }

    // Magnification -> "8x"
    if (key === "magnification") {
      const n = Number(v.replace(/x/i, "").trim());
      return Number.isFinite(n) ? `${n}x` : v;
    }

    // Yes/No style fields
    if (key === "nitrogen filled" || key === "ed lens" || key === "waterproof") {
      if (/yes|true|y/i.test(v)) return "Yes";
      if (/no|false|n/i.test(v)) return "No";
      return titleCase(v);
    }

    // Objective/weight tidy numeric
    if (key === "objective (mm)" || key === "weight") {
      const m = v.match(/(\d+(\.\d+)?)/);
      return m ? `${m[1]}` : v;
    }

    return v;
  }

  function productName(p) {
    return (
      safeText(p.name) ||
      `${safeText(p.brand)} ${safeText(p.model)}`.trim() ||
      safeText(p.id) ||
      "Product"
    );
  }

  function buildSpecMap(p) {
    const map = new Map();

    // Core fields
    if (p.brand) map.set("brand", safeText(p.brand));
    if (p.model) map.set("model", safeText(p.model));
    if (p.magnification) map.set("magnification", safeText(p.magnification));
    if (p.objective_diameter_mm) map.set("objective (mm)", safeText(p.objective_diameter_mm));
    if (p.weight_g) map.set("weight", safeText(p.weight_g));
    if (p.warranty) map.set("warranty", safeText(p.warranty));

    // Pull specs object (supports multiple possible property names)
    const specsObj =
      p.specs ||
      p.specifications ||
      p.specifications_table ||
      p.specification ||
      null;

    if (specsObj && typeof specsObj === "object" && !Array.isArray(specsObj)) {
      Object.entries(specsObj).forEach(([k, v]) => {
        const nk = normaliseKey(k);
        const nv = safeText(v);
        if (!nv) return;

        // merge duplicates: prefer longer value
        if (!map.has(nk)) map.set(nk, nv);
        else {
          const existing = safeText(map.get(nk));
          if (nv.length > existing.length) map.set(nk, nv);
        }
      });
    }

    // Pull specs array (if present)
    const specsArr = p.specs_list || p.specList || p.specifications_list || null;
    if (Array.isArray(specsArr)) {
      specsArr.forEach((row) => {
        const nk = normaliseKey(row?.label || row?.key || "");
        const nv = safeText(row?.value);
        if (!nk || !nv) return;

        if (!map.has(nk)) map.set(nk, nv);
        else {
          const existing = safeText(map.get(nk));
          if (nv.length > existing.length) map.set(nk, nv);
        }
      });
    }

    // Normalise values at end
    for (const [k, v] of map.entries()) {
      const nk = normaliseKey(k);
      map.set(nk, normaliseValueForKey(nk, v));
    }

    return map;
  }

  function placeholderCell(text = "—") {
    return `<span class="muted">${encodeHtml(text)}</span>`;
  }

  function renderCompare(products) {
    if (!products.length) {
      tableHost.innerHTML = `
        <div class="compare-wrap">
          <div class="card">
            <h2 style="margin:0 0 8px;">No products selected</h2>
            <p class="muted" style="margin:0;">Go back to Browse and tick “Add to compare” on 2 products.</p>
          </div>
        </div>
      `;
      return;
    }

    const specMaps = products.map(buildSpecMap);

    const allKeys = new Set();
    specMaps.forEach((m) => [...m.keys()].forEach((k) => allKeys.add(k)));

    const preferred = [
      "brand",
      "model",
      "magnification",
      "objective (mm)",
      "weight",
      "warranty",
      "close focus",
      "dimensions",
      "nitrogen filled",
      "ed lens",
      "waterproof",
      "eye relief (mm)",
      "exit pupil (mm)",
      "field of view (degrees)",
      "field of view (m/1000m)",
    ];

    const keysSorted = [
      ...preferred.filter((k) => allKeys.has(k)),
      ...[...allKeys]
        .filter((k) => !preferred.includes(k))
        .sort((a, b) => displayKey(a).localeCompare(displayKey(b))),
    ];

    const headerCols = products
      .map((p) => `<th>${encodeHtml(productName(p))}</th>`)
      .join("");

    const rows = keysSorted
      .map((k) => {
        const cells = specMaps
          .map((m) => {
            const val = safeText(m.get(k));
            return `<td>${val ? encodeHtml(val) : placeholderCell("—")}</td>`;
          })
          .join("");

        return `<tr><th class="spec">${encodeHtml(displayKey(k))}</th>${cells}</tr>`;
      })
      .join("");

    tableHost.innerHTML = `
      <div class="compare-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="spec">Spec</th>
              ${headerCols}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  async function loadProducts() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("products.json is not an array");
    return data;
  }

  function pickCompared(all) {
    const ids = getCompareIds().slice(0, MAX_COMPARE);
    return ids
      .map((id) => all.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
  }

  // Idle timeout
  let idleTimer = null;
  function resetIdle() {
    if (!IDLE_MINUTES) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (CLEAR_ON_LEAVE) clearCompare();
      window.location.href = "index.html";
    }, IDLE_MINUTES * 60 * 1000);
  }

  function bindIdleEvents() {
    if (!IDLE_MINUTES) return;
    ["click", "mousemove", "keydown", "touchstart", "scroll"].forEach((ev) => {
      window.addEventListener(ev, resetIdle, { passive: true });
    });
    resetIdle();
  }

  function bindClearOnLeave() {
    if (!CLEAR_ON_LEAVE) return;

    window.addEventListener("beforeunload", () => {
      clearCompare();
    });

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href && !href.includes("compare.html")) clearCompare();
    });
  }

  async function init() {
    if (els.pageTitle) els.pageTitle.textContent = "Compare";

    updateCompareCount();
    bindIdleEvents();
    bindClearOnLeave();

    try {
      const all = await loadProducts();
      const compared = pickCompared(all);
      renderCompare(compared);
    } catch (err) {
      console.error(err);
      tableHost.innerHTML = `
        <div class="compare-wrap">
          <div class="card error">
            <h2 style="margin:0 0 8px;">Compare failed</h2>
            <p class="muted" style="margin:0;">Check that <code>${encodeHtml(DATA_URL)}</code> exists and is valid JSON.</p>
          </div>
        </div>
      `;
    }
  }

  init();
})();
