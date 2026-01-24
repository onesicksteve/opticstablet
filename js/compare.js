// js/compare.js
(() => {
  const STORAGE_COMPARE = "rspb_compare_ids";
  const MAX_COMPARE = 2;
  const DATA_URL = "data/products.json";

  // Optional: clear compare when leaving compare screen (you asked for this)
  const CLEAR_ON_LEAVE = true;

  // Optional: inactivity timeout back to home (minutes)
  const IDLE_MINUTES = 5;

  const els = {
    container:
      document.getElementById("compareContainer") ||
      document.getElementById("compare") ||
      document.getElementById("content") ||
      document.body,

    tableWrap:
      document.getElementById("compareTable") ||
      document.getElementById("table") ||
      document.getElementById("compareTableWrap") ||
      document.getElementById("compareGrid") ||
      null,

    title: document.getElementById("pageTitle") || document.getElementById("title"),
    backBtn: document.getElementById("backBtn"),
    clearBtn: document.getElementById("clearCompare"),
  };

  // If you have a dedicated element, use it. Otherwise we will inject our own table.
  if (!els.tableWrap) {
    els.tableWrap = document.createElement("div");
    els.tableWrap.id = "compareTable";
    els.container.appendChild(els.tableWrap);
  }

  // -----------------------------
  // Utilities
  // -----------------------------
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

  function formatMaybeNumber(s) {
    const v = safeText(s);
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : v;
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

  function placeholderCell(text = "—") {
    return `<span class="muted">${encodeHtml(text)}</span>`;
  }

  // -----------------------------
  // Key normalisation (merge duplicates)
  // -----------------------------
  function normaliseKey(rawKey) {
    const k = safeText(rawKey).toLowerCase();

    // Close focus variants
    if (k.includes("close focus")) return "close focus";

    // Dimensions variants
    if (k.includes("dimension")) return "dimensions";

    // Nitrogen filled variants
    if (k.replace(/-/g, " ").includes("nitrogen filled")) return "nitrogen filled";
    if (k.replace(/-/g, " ").includes("nitrogen-filled")) return "nitrogen filled";

    // Weight
    if (k === "weight" || k.includes("weight")) return "weight";

    // Warranty
    if (k.includes("warranty")) return "warranty";

    // Magnification + objective
    if (k === "magnification") return "magnification";
    if (k.includes("objective") && k.includes("mm")) return "objective (mm)";
    if (k.includes("objective lens")) return "objective (mm)";
    if (k.includes("objective") && !k.includes("mm")) return "objective (mm)";

    // Eye relief / exit pupil / FOV
    if (k.includes("eye relief")) return "eye relief (mm)";
    if (k.includes("exit pupil")) return "exit pupil (mm)";
    if (k.includes("field of view") && k.includes("1000")) return "field of view (m/1000m)";
    if (k.includes("field of view") && k.includes("degree")) return "field of view (degrees)";

    // ED lens
    if (k === "ed lens" || k.includes("ed lens")) return "ed lens";

    // Waterproof
    if (k.includes("waterproof")) return "waterproof";

    // Default: keep original but tidy
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
        // If already nice-ish, title case it
        return titleCase(key);
    }
  }

  // -----------------------------
  // Value normalisation (your required dimensions style)
  // -----------------------------
  function normaliseValueForKey(key, value) {
    const v = safeText(value);
    if (!v) return "";

    // Close focus -> always "X m"
    if (key === "close focus") {
      let s = v.replace(/\s+/g, " ").trim();
      s = s.replace(/m\b/i, "").trim();
      const n = Number(s);
      if (Number.isFinite(n)) return `${n} m`;

      // If it contains a number somewhere, use it
      const m = s.match(/(\d+(\.\d+)?)/);
      if (m) return `${m[1]} m`;

      return v;
    }

    // Dimensions -> always "L125 x W120 x H50" (with — if missing)
    if (key === "dimensions") {
      let s = v
        .replace(/×/g, "x")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // labelled first
      let L = (s.match(/\bL\s*(\d+(\.\d+)?)/i) || [])[1];
      let W = (s.match(/\bW\s*(\d+(\.\d+)?)/i) || [])[1];
      let H = (s.match(/\bH\s*(\d+(\.\d+)?)/i) || [])[1];

      // fallback to plain numbers in order
      const nums =
        s
          .replace(/\b[DLWH]\b/gi, "")
          .match(/(\d+(\.\d+)?)/g)
          ?.map(Number) || [];

      if (!L && nums[0]) L = nums[0];
      if (!W && nums[1]) W = nums[1];
      if (!H && nums[2]) H = nums[2];

      return `L${L ?? "—"} x W${W ?? "—"} x H${H ?? "—"}`;
    }

    // Magnification -> "8x"
    if (key === "magnification") {
      const n = Number(v.replace(/x/i, "").trim());
      return Number.isFinite(n) ? `${n}x` : v;
    }

    // Nitrogen filled -> Yes/No
    if (key === "nitrogen filled") {
      if (/yes|true|y/i.test(v)) return "Yes";
      if (/no|false|n/i.test(v)) return "No";
      return titleCase(v);
    }

    // ED lens -> Yes/No
    if (key === "ed lens") {
      if (/yes|true|y/i.test(v)) return "Yes";
      if (/no|false|n/i.test(v)) return "No";
      return titleCase(v);
    }

    // Waterproof -> Yes/No
    if (key === "waterproof") {
      if (/yes|true|y/i.test(v)) return "Yes";
      if (/no|false|n/i.test(v)) return "No";
      return titleCase(v);
    }

    // Weight -> just number (g) if possible
    if (key === "weight") {
      const m = v.match(/(\d+(\.\d+)?)/);
      return m ? `${m[1]}` : v;
    }

    // Objective -> number if possible
    if (key === "objective (mm)") {
      const m = v.match(/(\d+(\.\d+)?)/);
      return m ? `${m[1]}` : v;
    }

    // Warranty -> tidy
    if (key === "warranty") {
      return v.replace(/\s+/g, " ").trim();
    }

    // Default
    return v;
  }

  // -----------------------------
  // Extract specs from a product
  // -----------------------------
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

    // Core fields (always include)
    if (p.brand) map.set("brand", safeText(p.brand));
    if (p.model) map.set("model", safeText(p.model));
    if (p.magnification) map.set("magnification", safeText(p.magnification));
    if (p.objective_diameter_mm) map.set("objective (mm)", safeText(p.objective_diameter_mm));
    if (p.weight_g) map.set("weight", safeText(p.weight_g));
    if (p.warranty) map.set("warranty", safeText(p.warranty));

    // If you store specs as an object, pull them in
    // Supports: p.specs OR p.specifications OR p.specifications_table etc.
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

        // Keep first if already present, unless the new one looks "more complete"
        if (!map.has(nk)) {
          map.set(nk, nv);
        } else {
          const existing = safeText(map.get(nk));
          // Prefer longer / more detailed value
          if (nv.length > existing.length) map.set(nk, nv);
        }
      });
    }

    // If you store specs as an array of {label, value}
    const specsArr = p.specs_list || p.specList || p.specifications_list || null;
    if (Array.isArray(specsArr)) {
      specsArr.forEach((row) => {
        const k = normaliseKey(row?.label || row?.key || "");
        const v = safeText(row?.value);
        if (!k || !v) return;
        if (!map.has(k)) map.set(k, v);
        else if (v.length > safeText(map.get(k)).length) map.set(k, v);
      });
    }

    // Normalise values after merging
    for (const [k, v] of map.entries()) {
      const nk = normaliseKey(k);
      const nv = normaliseValueForKey(nk, v);
      map.set(nk, nv);
    }

    return map;
  }

  // -----------------------------
  // Render table
  // -----------------------------
  function renderCompare(products) {
    if (!products.length) {
      els.tableWrap.innerHTML = `
        <div class="card">
          <h2 style="margin:0 0 8px;">No products selected</h2>
          <p class="muted" style="margin:0;">Go back to Browse and tick “Add to compare” on 2 products.</p>
        </div>
      `;
      return;
    }

    const specMaps = products.map(buildSpecMap);

    // Union of all keys across products
    const allKeys = new Set();
    specMaps.forEach((m) => [...m.keys()].forEach((k) => allKeys.add(k)));

    // Preferred order first
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
            const raw = m.get(k);
            const val = safeText(raw);
            return `<td>${val ? encodeHtml(val) : placeholderCell("—")}</td>`;
          })
          .join("");
        return `<tr><th class="spec">${encodeHtml(displayKey(k))}</th>${cells}</tr>`;
      })
      .join("");

    els.tableWrap.innerHTML = `
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

  // -----------------------------
  // Data + init
  // -----------------------------
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

  // -----------------------------
  // Idle timeout (optional)
  // -----------------------------
  let idleTimer = null;
  function resetIdle() {
    if (!IDLE_MINUTES) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // Optionally clear compare on timeout
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

  // -----------------------------
  // Clear compare when leaving compare screen
  // -----------------------------
  function bindClearOnLeave() {
    if (!CLEAR_ON_LEAVE) return;

    // Clears when navigating away/closing tab
    window.addEventListener("beforeunload", () => {
      clearCompare();
    });

    // Also clear if they click any link away
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      // if it goes somewhere else (not staying on compare)
      if (href && !href.includes("compare.html")) {
        clearCompare();
      }
    });
  }

  async function init() {
    try {
      if (els.title) els.title.textContent = "Compare";

      if (els.clearBtn) {
        els.clearBtn.addEventListener("click", () => {
          clearCompare();
          renderCompare([]);
        });
      }

      bindIdleEvents();
      bindClearOnLeave();

      const all = await loadProducts();
      const compared = pickCompared(all);

      // Enforce “2 only” UX: if 1 selected, still show table but with one column
      renderCompare(compared);
    } catch (err) {
      console.error(err);
      els.tableWrap.innerHTML = `
        <div class="card error">
          <h2 style="margin:0 0 8px;">Compare failed</h2>
          <p class="muted" style="margin:0;">Check that <code>${encodeHtml(DATA_URL)}</code> exists and is valid JSON.</p>
        </div>
      `;
    }
  }

  init();
})();
