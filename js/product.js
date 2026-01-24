const DATA_URL = "data/products.json";
const CONTENT_URL = "data/content.json";

const COMPARE_KEY = "rspb_compare_ids";
const REWARDS_KEY = "rspb_show_rewards";

const statusEl = document.getElementById("status");
const cardEl = document.getElementById("productCard");
const backBtn = document.getElementById("backBtn");
const titleEl = document.getElementById("pageTitle");

const imgEl = document.getElementById("productImage");
const nameEl = document.getElementById("productName");
const priceEl = document.getElementById("productPrice");
const quickFactsEl = document.getElementById("quickFacts");
const bestForEl = document.getElementById("bestFor");

const addToCompareBtn = document.getElementById("addToCompare");
const goCompareLink = document.getElementById("goCompare");

const rewardsToggle = document.getElementById("rewardsToggle");
const rewardsBox = document.getElementById("rewardsBox");

const descEl = document.getElementById("description");
const featuresEl = document.getElementById("features");
const specsBody = document.getElementById("specsBody");

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatGBP(n){
  if (typeof n !== "number") return "";
  return new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(n);
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

function isRewardsOn(){
  return localStorage.getItem(REWARDS_KEY) === "true";
}
function setRewardsOn(v){
  localStorage.setItem(REWARDS_KEY, v ? "true" : "false");
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

function getIdFromUrl(){
  const url = new URL(window.location.href);
  return url.searchParams.get("id") || "";
}

function setBackLink(category){
  if (!category) return;
  backBtn.href = `browse.html?cat=${encodeURIComponent(category)}`;
}

function renderRewards(p){
  if (!isRewardsOn()){
    rewardsBox.hidden = true;
    rewardsBox.innerHTML = "";
    return;
  }

  const r = calcRewards(p.price_gbp);
  rewardsBox.hidden = false;
  rewardsBox.innerHTML = `
    <div><b>Rewards:</b> ${r.normalPoints} pts (${escapeHtml(formatGBP(r.normalValue))})</div>
    <div><b>Double points:</b> ${r.doublePoints} pts (${escapeHtml(formatGBP(r.doubleValue))})</div>
  `;
}

function renderCompareButton(productId){
  const ids = getCompareIds();
  const selected = ids.includes(productId);

  addToCompareBtn.textContent = selected ? "Remove from compare" : "Add to compare";

  if (ids.length === 2){
    goCompareLink.hidden = false;
  } else {
    goCompareLink.hidden = true;
  }
}

function toggleCompare(productId){
  const ids = getCompareIds();
  const selected = ids.includes(productId);

  if (selected){
    setCompareIds(ids.filter(x => x !== productId));
    renderCompareButton(productId);
    return;
  }

  if (ids.length >= 2){
    alert("You can only compare 2 items.");
    return;
  }

  ids.push(productId);
  setCompareIds(ids);
  renderCompareButton(productId);

  if (ids.length === 2){
    // kiosk flow: jump to compare as soon as 2 are selected
    window.location.href = "compare.html";
  }
}

function renderQuickFacts(p){
  const items = [];
  if (p.warranty) items.push(["Warranty", p.warranty]);
  if (p.value_for_money) items.push(["Value", p.value_for_money]);
  if (typeof p.weight_g === "number" && p.weight_g > 0) items.push(["Weight", `${p.weight_g} g`]);

  quickFactsEl.innerHTML = items.map(([k,v]) => `
    <div class="qfItem"><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</div>
  `).join("");
}

function renderBestFor(p){
  const tags = Array.isArray(p.best_for) ? p.best_for : [];
  bestForEl.innerHTML = tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");
}

function renderDescription(content){
  if (!content || !Array.isArray(content.paragraphs) || content.paragraphs.length === 0){
    descEl.innerHTML = `<p class="muted">No description yet.</p>`;
    return;
  }
  descEl.innerHTML = content.paragraphs
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function renderFeatures(content){
  const feats = content && Array.isArray(content.features) ? content.features : [];
  if (!feats.length){
    featuresEl.innerHTML = `<li class="muted">No key features yet.</li>`;
    return;
  }
  featuresEl.innerHTML = feats.map(f => `<li>${escapeHtml(f)}</li>`).join("");
}

function renderSpecs(p){
  const specs = p.specs || {};
  const entries = Object.entries(specs);

  if (!entries.length){
    specsBody.innerHTML = `<tr><td class="specKey">Specs</td><td class="muted">No specs yet.</td></tr>`;
    return;
  }

  specsBody.innerHTML = entries.map(([k,v]) => `
    <tr>
      <td class="specKey">${escapeHtml(k)}</td>
      <td class="specVal">${escapeHtml(v)}</td>
    </tr>
  `).join("");
}

function renderImage(p){
  if (p.image){
    imgEl.innerHTML = `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.brand)} ${escapeHtml(p.model)}">`;
  } else {
    imgEl.innerHTML = `<div class="muted">No image</div>`;
  }
}

async function init(){
  const id = getIdFromUrl();
  if (!id){
    statusEl.textContent = "No product selected.";
    return;
  }

  statusEl.textContent = "Loading…";

  const [prodRes, contentRes] = await Promise.all([
    fetch(DATA_URL, { cache: "no-store" }),
    fetch(CONTENT_URL, { cache: "no-store" })
  ]);

  if (!prodRes.ok) throw new Error("Failed to load product data");
  const products = await prodRes.json();

  // content file is optional
  let contentMap = {};
  if (contentRes.ok){
    contentMap = await contentRes.json();
  }

  const p = products.find(x => x.id === id);
  if (!p){
    statusEl.textContent = "Product not found.";
    return;
  }

  const content = contentMap[id] || null;

  // Header
  const fullName = `${p.brand || ""} ${p.model || ""}`.trim();
  titleEl.textContent = fullName || "Product";
  document.title = fullName || "Product";

  setBackLink(p.category);

  // Rewards toggle
  rewardsToggle.checked = isRewardsOn();
  rewardsToggle.addEventListener("change", () => {
    setRewardsOn(rewardsToggle.checked);
    renderRewards(p);
  });

  // Render
  statusEl.textContent = "";
  cardEl.hidden = false;

  renderImage(p);
  nameEl.textContent = fullName;
  priceEl.textContent = formatGBP(p.price_gbp);

  renderQuickFacts(p);
  renderBestFor(p);
  renderRewards(p);

  renderDescription(content);
  renderFeatures(content);
  renderSpecs(p);

  // Compare
  renderCompareButton(p.id);
  addToCompareBtn.addEventListener("click", () => toggleCompare(p.id));
}

init().catch(err => {
  console.error(err);
  statusEl.textContent = "Could not load product.";
});
