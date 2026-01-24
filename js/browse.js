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
  if (!list || !search) return;

  const q = search.value.toLowerCase();
  list.innerHTML = "";

  products
    .filter(p => (p.brand + " " + p.model).toLowerCase().includes(q))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h3>${p.brand} ${p.model}</h3>
        <div class="price">£${p.price_gbp}</div>
        <div>Warranty: ${p.warranty || ""}</div>
        <div>Weight: ${p.weight_g ?? ""} g</div>
        ${
          showRewards
            ? `<div class="rewards">Rewards value: £${((p.rewards_value_gbp || 0)).toFixed(2)}</div>`
            : ""
        }
        <a href="product.html?id=${encodeURIComponent(p.id)}">View</a>
      `;

      list.appendChild(div);
    });
}
