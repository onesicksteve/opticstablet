
const STORAGE_KEY = "rspb_compare_ids";
const REWARDS_KEY = "rspb_rewards_mode"; // boolean
const POINTS_PER_POUND_NORMAL = 2;
const POINTS_PER_POUND_DOUBLE = 4;
const POUNDS_PER_POINT = 1/100;

function getCompareIds(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function setCompareIds(ids){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
function addToCompare(id){
  const ids = getCompareIds();
  if (!ids.includes(id)) ids.push(id);
  setCompareIds(ids);
  return ids;
}
function removeFromCompare(id){
  const ids = getCompareIds().filter(x => x !== id);
  setCompareIds(ids);
  return ids;
}
function clearCompare(){
  setCompareIds([]);
}
function getRewardsMode(){
  return localStorage.getItem(REWARDS_KEY) === "true";
}
function setRewardsMode(v){
  localStorage.setItem(REWARDS_KEY, v ? "true" : "false");
}
function formatGBP(n){
  try { return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n); }
  catch { return "£" + Number(n).toFixed(2); }
}
function calcRewards(price){
  const pounds = Number(price) || 0;
  const normalPoints = Math.round(pounds * POINTS_PER_POUND_NORMAL);
  const doublePoints = Math.round(pounds * POINTS_PER_POUND_DOUBLE);
  return {
    normalPoints,
    normalValue: normalPoints * 0.01,
    doublePoints,
    doubleValue: doublePoints * 0.01
  };
}
async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load " + path);
  return await res.json();
}

function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name) || "";
}
function setComparePill(){
  const countEl = document.getElementById("compareCount");
  const ids = getCompareIds();
  if (countEl) countEl.textContent = String(ids.length);
}
function productCard(p, rewardsOn){
  const imgSrc = p.image ? `Images/${p.image}` : "";
  const tags = (p.tags || []).slice(0,3);
  const rewards = calcRewards(p.price);
  const rewardsHtml = rewardsOn ?
    `<div class="rewards">
      <div><strong>Normal:</strong> ${rewards.normalPoints} pts (${formatGBP(rewards.normalValue)})</div>
      <div><strong>Optics weekend:</strong> ${rewards.doublePoints} pts (${formatGBP(rewards.doubleValue)})</div>
    </div>`
    : "";
  return `
    <section class="card product-card">
      <img class="thumb" src="${imgSrc}" alt="${p.name || ""}" onerror="this.style.display='none'" />
      <div>
        <h2 class="title">${p.name}</h2>
        <div class="price">${formatGBP(p.price)}</div>
        <div class="kv">
          <div><strong>Warranty:</strong> ${p.warranty || ""}</div>
          <div><strong>Value:</strong> ${p.value || ""}</div>
          <div><strong>Weight:</strong> ${p.weight_g ? (p.weight_g + " g") : (p.weight || "")}</div>
        </div>
        <div class="tag-row">
          ${tags.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        ${rewardsHtml}
        <div class="actions">
          <a class="btn ghost" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
          <label class="toggle" style="color:var(--text);font-weight:650">
            <input type="checkbox" data-compare-id="${p.id}" ${getCompareIds().includes(p.id) ? "checked" : ""} />
            <span>Compare</span>
          </label>
        </div>
      </div>
    </section>
  `;
}
function wireCompareCheckboxes(){
  document.querySelectorAll("input[data-compare-id]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-compare-id");
      if (e.target.checked) addToCompare(id);
      else removeFromCompare(id);
      setComparePill();
    });
  });
}
(async function init(){
  const cat = getParam("cat") || "Binoculars";
  document.getElementById("pageTitle").textContent = `Browse ${cat.toLowerCase()}`;

  const rewardsToggle = document.getElementById("rewardsToggle");
  rewardsToggle.checked = getRewardsMode();
  rewardsToggle.addEventListener("change", () => {
    setRewardsMode(rewardsToggle.checked);
    render();
  });

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => render());

  let all = [];
  try {
    all = await loadJSON("data/products.json");
  } catch (e){
    document.getElementById("grid").innerHTML = `<section class="card">Could not load products.json</section>`;
    console.error(e);
    return;
  }

  function render(){
    setComparePill();
    const q = (searchInput.value || "").trim().toLowerCase();
    const filtered = all.filter(p => (p.category || "") === cat)
      .filter(p => !q || (p.name||"").toLowerCase().includes(q) || (p.brand||"").toLowerCase().includes(q));
    document.getElementById("itemCount").textContent = `${filtered.length} item(s)`;
    const grid = document.getElementById("grid");
    const rewardsOn = rewardsToggle.checked;
    grid.innerHTML = filtered.map(p => productCard(p, rewardsOn)).join("");
    wireCompareCheckboxes();
  }

  render();
})();
