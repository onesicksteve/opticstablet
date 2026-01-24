
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
function renderSpecs(tableEl, specs){
  const rows = Object.entries(specs || {}).map(([k,v]) => {
    return `<tr><th>${k}</th><td>${v}</td></tr>`;
  }).join("");
  tableEl.innerHTML = rows || `<tr><td>No specs found.</td></tr>`;
}
(async function init(){
  const id = getParam("id");
  const backLink = document.getElementById("backLink");
  // try preserve browse cat
  const ref = document.referrer || "";
  backLink.href = ref.includes("browse.html") ? ref : "browse.html?cat=Binoculars";

  let all = [];
  let content = {};
  try { all = await loadJSON("data/products.json"); } catch (e){ console.error(e); return; }
  try { content = await loadJSON("data/content.json"); } catch (e){ content = {}; }

  const p = all.find(x => x.id === id) || all[0];
  if (!p) return;

  document.title = p.name;
  document.getElementById("productTitle").textContent = p.name;
  const img = document.getElementById("productImg");
  img.src = p.image ? `Images/${p.image}` : "";
  img.alt = p.name;

  document.getElementById("productPrice").textContent = formatGBP(p.price);
  document.getElementById("productWarranty").textContent = p.warranty || "";
  document.getElementById("productValue").textContent = p.value || "";
  document.getElementById("productWeight").textContent = p.weight_g ? (p.weight_g + " g") : (p.weight || "");

  const tags = (p.tags || []).slice(0,6);
  document.getElementById("tagRow").innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join("");

  const c = content[p.id] || {};
  document.getElementById("desc").textContent = c.description || "";
  const ul = document.getElementById("features");
  ul.innerHTML = (c.features || []).map(x => `<li>${x}</li>`).join("");

  renderSpecs(document.getElementById("specsTable"), p.specs);

  // compare button
  const addBtn = document.getElementById("addCompareBtn");
  addBtn.addEventListener("click", () => {
    addToCompare(p.id);
    setComparePill();
    addBtn.textContent = "Added";
    setTimeout(() => addBtn.textContent = "Add to compare", 900);
  });

  // rewards toggle under the button
  const rewardsToggle = document.getElementById("rewardsToggle");
  const rewardsInfo = document.getElementById("rewardsInfo");
  function updateRewards(){
    setRewardsMode(rewardsToggle.checked);
    if (!rewardsToggle.checked){
      rewardsInfo.classList.add("hidden");
      return;
    }
    const r = calcRewards(p.price);
    rewardsInfo.innerHTML = `
      <div><strong>Normal:</strong> ${r.normalPoints} pts (${formatGBP(r.normalValue)})</div>
      <div><strong>Optics weekend:</strong> ${r.doublePoints} pts (${formatGBP(r.doubleValue)})</div>
    `;
    rewardsInfo.classList.remove("hidden");
  }
  rewardsToggle.checked = getRewardsMode();
  rewardsToggle.addEventListener("change", updateRewards);
  updateRewards();

  setComparePill();
})();
