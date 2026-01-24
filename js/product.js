const box = document.getElementById("product");
const id = new URLSearchParams(location.search).get("id");

fetch("data/products.json")
  .then(r => r.json())
  .then(products => {
    const p = products.find(x => x.id === id);
    if (!p) {
      box.textContent = "Product not found";
      return;
    }

    box.innerHTML = `
      <h2>${p.brand} ${p.model}</h2>
      <div>£${p.price_gbp}</div>
      <div>${p.warranty}</div>
      <div>${p.weight_g} g</div>
    `;
  });