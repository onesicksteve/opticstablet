// js/compare.js
// Compares up to 2 products selected elsewhere in the app.
// Expected localStorage key: "compare" (array of product ids) or "compareItems" (array of product ids).

const box = document.getElementById("compare");

function formatPrice(p) {
  const gbp = (n) => `£${Number(n).toFixed(0)}`;
  if (p && p.sale_price_gbp != null && p.sale_price_gbp !== "") {
    return `
      <div class="compare-price">
        <span class="old-price">${gbp(p.price_gbp)}</span>
        <span class="sale-price">${gbp(p.sale_price_gbp)}</span>
      </div>
    `;
  }
  return `<div class="compare-price">${gbp(p.price_gbp)}</div>`;
}

function getCompareIds() {
  const keys = ["compare", "compareItems"];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr.slice(0, 2);
    } catch (e) {
      // ignore
    }
  }
  return [];
}

function renderTable(p1, p2) {
  // Prefer specs object; fall back to a small set of known top-level fields.
  const s1 = (p1 && p1.specs) ? p1.specs : {};
  const s2 = (p2 && p2.specs) ? p2.specs : {};

  const keys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]));
  keys.sort((a, b) => a.localeCompare(b));

  const table = document.createElement("table");
  table.className = "compare-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Spec</th>
      <th>${p1 ? `${p1.brand} ${p1.model}` : "-"}</th>
      <th>${p2 ? `${p2.brand} ${p2.model}` : "-"}</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  keys.forEach((k) => {
    const v1 = (s1[k] != null && s1[k] !== "") ? s1[k] : "—";
    const v2 = (s2[k] != null && s2[k] !== "") ? s2[k] : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="spec-name">${k}</td>
      <td>${v1}</td>
      <td>${v2}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

function render(products) {
  const ids = getCompareIds();

  if (!ids.length) {
    box.textContent = "No products selected to compare.";
    return;
  }

  const selected = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 2);

  const p1 = selected[0] || null;
  const p2 = selected[1] || null;

  // Header cards (name + price at top, per requirement)
  const header = document.createElement("div");
  header.className = "compare-header";

  const mkCard = (p) => {
    const div = document.createElement("div");
    div.className = "compare-card";
    if (!p) {
      div.innerHTML = `<h2>—</h2><div class="compare-price">—</div>`;
      return div;
    }
    div.innerHTML = `
      <h2>${p.brand} ${p.model}</h2>
      ${formatPrice(p)}
    `;
    return div;
  };

  header.appendChild(mkCard(p1));
  header.appendChild(mkCard(p2));
  box.innerHTML = "";
  box.appendChild(header);

  // Specs table
  box.appendChild(renderTable(p1, p2));
}

fetch("data/products.json")
  .then((r) => r.json())
  .then((products) => render(products))
  .catch(() => {
    box.textContent = "Could not load products.";
  });
