document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("list");
  const search = document.getElementById("search");
  const toggleRewards = document.getElementById("toggleRewards");

  let products = [];
  let showRewards = false;

  fetch("data/products.json")
    .then(r => r.json())
    .then(data => {
      products = data;
      render();
    });

  if (toggleRewards) {
    toggleRewards.addEventListener("change", () => {
      showRewards = toggleRewards.checked;
      render();
    });
  }

  if (search) {
    search.addEventListener("input", render);
  }

  function render() {
    if (!list) return;

    const q = (search?.value || "").toLowerCase();
    list.innerHTML = "";

    products
      .filter(p => (p.brand + " " + p.model).toLowerCase().includes(q))
      .forEach(p => {
        const div = document.createElement("div");
        div.className = "card";

        const rewardsValue = (p.price_gbp * 4 / 100).toFixed(2);

        div.innerHTML = `
          <h3>${p.brand} ${p.model}</h3>
          <div class="price">£${p.price_gbp}</div>
          <div>Warranty: ${p.warranty}</div>
          <div>Weight: ${p.weight_g} g</div>
          ${showRewards ? `<div class="rewards">Rewards value: £${rewardsValue}</div>` : ""}
          <a href="product.html?id=${encodeURIComponent(p.id)}">View</a>
        `;

        list.appendChild(div);
      });
  }
});

const list = document.getElementById("list");
const search = document.getElementById("search");
const toggleRewards = document.getElementById("toggleRewards");

let products = [];
let showRewards = false;

fetch("data/products.json")
  .then(r => r.json())
  .then(data => {
    products = data;
    render();
  });

toggleRewards.addEventListener("change", () => {
  showRewards = toggleRewards.checked;
  render();
});

search.addEventListener("input", render);

function render() {
  if (!list) return;

  const q = search.value.toLowerCase();
  list.innerHTML = "";

  products
    .filter(p =>
      (p.brand + " " + p.model).toLowerCase().includes(q)
    )
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>${p.brand} ${p.model}</h3>
        <div class="price">£${p.price_gbp}</div>
        <div>Warranty: ${p.warranty}</div>
        <div>Weight: ${p.weight_g} g</div>
        ${showRewards ? `<div class="rewards">Rewards value: £${(p.rewards/100).toFixed(2)}</div>` : ""}
        <a href="product.html?id=${encodeURIComponent(p.id)}">View</a>
      `;

      list.appendChild(div);
    });
}
