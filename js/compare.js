const DATA_URL = "data/products.json";
const COMPARE_KEY = "rspb_compare_ids";
const REWARDS_KEY = "rspb_show_rewards";

const statusEl = document.getElementById("status");
const headerEl = document.getElementById("compareHeader");
const tableWrapEl = document.getElementById("compareTableWrap");
const tbody = document.getElementById("compareBody");
const colA = document.getElementById("colA");
const colB = document.getElementById("colB");
const clearTop = document.getElementById("clearCompareTop");
const rewardsToggle = document.getElementById("rewardsToggle");


function isRewardsOn(){
  return localStorage.getItem(REWARDS_KEY) === "true";
}
function setRewardsOn(v){
  localStorage.setItem(REWARDS_KEY, v ? "true" : "false");
}
function calcRewards(price){
  const p = (typeof price === "number" && isFinite(price)) ? price : 0;
  const normalPoints = Math.floor(p * 2);
  const doublePoints = Math.floor(p * 4);
  return {
    normalPoints,
    normalValue: normalPoints / 100,
    doublePoints,
    doubleValue: doublePoints / 100
  };
}

function formatGBP(n){
  if (typeof n !== "number") return "";
  return new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(n);
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
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

function pill(text){
  return `<span class="pill">${escapeHtml(text)}</span>`;
}

function renderHeader(a, b){
  const tagsA = Array.isArray(a.best_for) ? a.best_for : [];
  const tagsB = Array.isArray(b.best_for) ? b.best_for : [];

  const imgA = a.image ? `<img src="${escapeHtml(a.image)}" alt="">` : "";
  const imgB = b.image ? `<img src="${escapeHtml(b.image)}" alt="">` : "";

  headerEl.innerHTML = `
    <div class="compareCard">
      <div class="compareCardTop">
        <div class="compareThumb">${imgA || "<span>Image</span>"}</div>
        <div>
          <h2 class="compareTitle">${escapeHtml(a.brand)} ${escapeHtml(a.model)}</h2>
          <div class="compareMeta">${escapeHtml(formatGBP(a.price_gbp))} · ${escapeHtml(a.warranty || "")} · ${escapeHtml((a.weight_g ?? ""))}${a.weight_g ? " g" : ""}</div>
          ${isRewardsOn() ? (()=>{const r=calcRewards(a.price_gbp); return `<div class="rewardsMeta">Rewards: ${r.normalPoints} pts (${escapeHtml(formatGBP(r.normalValue))})</div><div class="rewardsMeta">Double points: ${r.doublePoints} pts (${escapeHtml(formatGBP(r.doubleValue))})</div>`;})() : ""}
          <div class="pills">${tagsA.map(pill).join("")}</div>
        </div>
      </div>
    </div>

    <div class="compareCard">
      <div class="compareCardTop">
        <div class="compareThumb">${imgB || "<span>Image</span>"}</div>
        <div>
          <h2 class="compareTitle">${escapeHtml(b.brand)} ${escapeHtml(b.model)}</h2>
          <div class="compareMeta">${escapeHtml(formatGBP(b.price_gbp))} · ${escapeHtml(b.warranty || "")} · ${escapeHtml((b.weight_g ?? ""))}${b.weight_g ? " g" : ""}</div>
          ${isRewardsOn() ? (()=>{const r=calcRewards(b.price_gbp); return `<div class="rewardsMeta">Rewards: ${r.normalPoints} pts (${escapeHtml(formatGBP(r.normalValue))})</div><div class="rewardsMeta">Double points: ${r.doublePoints} pts (${escapeHtml(formatGBP(r.doubleValue))})</div>`;})() : ""}
          <div class="pills">${tagsB.map(pill).join("")}</div>
        </div>
      </div>
    </div>
  `;
}

function getSpecKeys(aSpecs, bSpecs){
  const keys = [];
  const push = (k) => { if (!keys.includes(k)) keys.push(k); };

  // preserve order from A first, then append any extra keys from B
  Object.keys(aSpecs || {}).forEach(push);
  Object.keys(bSpecs || {}).forEach(push);

  return keys;
}

function renderTable(a, b){
  const aSpecs = a.specs || {};
  const bSpecs = b.specs || {};
  const keys = getSpecKeys(aSpecs, bSpecs);

  colA.textContent = `${a.brand} ${a.model}`;
  colB.textContent = `${b.brand} ${b.model}`;

  if (keys.length === 0){
    tbody.innerHTML = `
      <tr>
        <td class="specCol"><b>Specs</b></td>
        <td colspan="2" class="muted">No specs yet. Add them under <code>specs</code> for each product in <code>data/products.json</code>.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = keys.map(k => {
    const av = (k in aSpecs) ? aSpecs[k] : "—";
    const bv = (k in bSpecs) ? bSpecs[k] : "—";
    const same = String(av).trim() === String(bv).trim();

    return `
      <tr class="${same ? "same" : "diff"}">
        <td class="specCol">${escapeHtml(k)}</td>
        <td>${escapeHtml(av)}</td>
        <td>${escapeHtml(bv)}</td>
      </tr>
    `;
  }).join("");
}

async function init(){
  clearTop.addEventListener("click", () => {
    setCompareIds([]);

  // Rewards toggle (shared with Browse)
  if (rewardsToggle){
    rewardsToggle.checked = isRewardsOn();
    rewardsToggle.addEventListener("change", () => {
      setRewardsOn(rewardsToggle.checked);
      window.location.reload();
    });
  }
    window.location.href = "browse.html";
  });

  const ids = getCompareIds();

  if (ids.length !== 2){
    statusEl.textContent = "Select two products to compare.";
    headerEl.hidden = true;
    tableWrapEl.hidden = true;
    return;
  }

  statusEl.textContent = "Loading…";

  const res = await fetch(DATA_URL, { cache:"no-store" });
  if (!res.ok) throw new Error("Failed to load product data");
  const products = await res.json();

  const a = products.find(p => p.id === ids[0]);
  const b = products.find(p => p.id === ids[1]);

  if (!a || !b){
    statusEl.textContent = "Could not load compare items. Please re-select them.";
    headerEl.hidden = true;
    tableWrapEl.hidden = true;
    return;
  }

  statusEl.textContent = "";
  headerEl.hidden = false;
  tableWrapEl.hidden = false;

  renderHeader(a, b);
  renderTable(a, b);
}

init().catch(err => {
  console.error(err);
  statusEl.textContent = "Could not load compare.";
});
