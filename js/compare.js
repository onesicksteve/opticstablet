
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

function setMeta(){
  const ids = getCompareIds();
  document.getElementById("compareMeta").textContent = `${ids.length} selected`;
}
function productSummary(p, rewardsOn){
  const imgSrc = p.image ? `Images/${p.image}` : "";
  const r = calcRewards(p.price);
  const rewardsHtml = rewardsOn ?
    `<div class="rewards">
      <div><strong>Normal:</strong> ${r.normalPoints} pts (${formatGBP(r.normalValue)})</div>
      <div><strong>Optics weekend:</strong> ${r.doublePoints} pts (${formatGBP(r.doubleValue)})</div>
    </div>` : "";
  return `
    <section class="card compare-item">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h2>${p.name}</h2>
        <button class="btn remove" data-remove="${p.id}">Remove</button>
      </div>
      <img class="thumb" src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none'"/>
      <div class="price" style="margin-top:10px">${formatGBP(p.price)}</div>
      ${rewardsHtml}
      <div class="specs-wrap" style="margin-top:12px">
        <table class="specs">
          ${Object.entries(p.specs||{}).map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
        </table>
      </div>
    </section>
  `;
}
(async function init(){
  const rewardsToggle = document.getElementById("rewardsToggle");
  rewardsToggle.checked = getRewardsMode();
  rewardsToggle.addEventListener("change", () => {
    setRewardsMode(rewardsToggle.checked);
    render();
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    clearCompare();
    render();
  });

  let all = [];
  try { all = await loadJSON("data/products.json"); } catch (e){
    document.getElementById("compareWrap").innerHTML = `<section class="card">Could not load products.json</section>`;
    console.error(e);
    return;
  }

  function wireRemove(){
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-remove");
        removeFromCompare(id);
        render();
      });
    });
  }

  function render(){
    setMeta();
    const ids = getCompareIds();
    const selected = ids.map(id => all.find(p => p.id===id)).filter(Boolean);
    const wrap = document.getElementById("compareWrap");
    if (selected.length === 0){
      wrap.innerHTML = `<section class="card">No items selected. Go back and tick “Compare” on two products.</section>`;
      return;
    }
    wrap.innerHTML = `<div class="compare-grid">${selected.map(p => productSummary(p, rewardsToggle.checked)).join("")}</div>`;
    wireRemove();
  }

  render();
})();
