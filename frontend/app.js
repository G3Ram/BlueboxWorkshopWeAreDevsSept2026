const userId = 'workshop-user';
const money = cents => `$${(cents / 100).toFixed(2)}`;
const api = (path, options) => fetch(path, { headers: { 'content-type': 'application/json' }, ...options }).then(async response => { const data = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(data.error); return data; });
let products = []; let cart = [];
const isOnSale = product => Boolean(product?.onSale ?? product?.on_sale ?? false);
const getDiscountedPrice = product => {
  if (!product) return 0;
  const originalPrice = Number(product.priceCents ?? product.price_cents ?? 0);
  if (!isOnSale(product)) return originalPrice;
  const discountPrice = Number(product.salePriceCents ?? product.sale_price_cents ?? Math.round(originalPrice * 0.8));
  return Number.isFinite(discountPrice) ? discountPrice : originalPrice;
};
const getCartTotal = () => cart.reduce((sum, item) => sum + getDiscountedPrice(item.product) * item.quantity, 0);
const renderCount = () => { document.querySelector('#cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0); };
const loadCart = () => api(`/api/cart?userId=${userId}`).then(items => { cart = items; renderCart(); }).catch(error => {
  console.error('Failed to load cart', error);
  cart = [];
  renderCart();
  const target = document.querySelector('#cart-items');
  if (target) target.innerHTML = '<p class="muted">Unable to load your cart right now. Please try again.</p>';
  return [];
});
const renderCart = () => { renderCount(); const target = document.querySelector('#cart-items'); if (!target) return; target.innerHTML = cart.length ? cart.map(item => {
  const originalPrice = Number(item.product.priceCents ?? item.product.price_cents ?? 0);
  const currentPrice = getDiscountedPrice(item.product);
  const lineTotal = currentPrice * item.quantity;
  const saleBadge = isOnSale(item.product) ? '<span class="sale-badge sale-badge-small">Flash Sale</span>' : '';
  const oldPrice = isOnSale(item.product) ? `<span class="price-old">${money(originalPrice)}</span>` : '';
  return `<div class="cart-item"><div class="cart-item-title-wrap"><span>${item.product.emoji} ${item.product.name}</span>${saleBadge}</div><div class="cart-item-price"><div class="price-stack">${oldPrice}<strong>${money(currentPrice)}</strong></div><b>${money(lineTotal)}</b></div></div>`;
}).join('') : '<p class="muted">Your cart is empty.</p>'; const total = getCartTotal(); const totalElement = document.querySelector('#cart-total'); if (totalElement) totalElement.textContent = money(total); };
const add = id => api(`/api/cart?userId=${userId}`, { method: 'POST', body: JSON.stringify({ productId: id, quantity: 1 }) }).then(items => { cart = items; renderCart(); });
const shopPage = () => { document.querySelector('#app').innerHTML = `<section class="intro"><p class="eyebrow">Workshop commerce lab</p><h1>Useful things for<br><em>curious work.</em></h1><p>A tiny, editable ecommerce experience with a PostgreSQL catalog, persistent cart, checkout, and payment service.</p></section><section><div class="section-heading"><h2>Shop the field notes</h2><span id="status">Loading...</span></div><div id="products" class="product-grid"></div></section>`; api('/api/products').then(items => { products = items; document.querySelector('#status').textContent = `${items.length} items`; document.querySelector('#products').innerHTML = items.map(product => {
  const originalPrice = Number(product.priceCents ?? product.price_cents ?? 0);
  const currentPrice = getDiscountedPrice(product);
  const saleBadge = isOnSale(product) ? '<span class="sale-badge">Flash Sale</span>' : '';
  const priceMarkup = isOnSale(product) ? `<div class="price-stack"><span class="price-old">${money(originalPrice)}</span><strong>${money(currentPrice)}</strong></div>` : `<strong>${money(originalPrice)}</strong>`;
  return `<article class="product"><div class="product-art">${product.emoji}</div><div class="product-head"><p class="category">${product.category}</p>${saleBadge}</div><h3>${product.name}</h3><p>${product.description}</p><div class="product-foot">${priceMarkup}<button data-id="${product.id}">Add to cart</button></div></article>`;
}).join(''); document.querySelectorAll('[data-id]').forEach(button => button.onclick = () => add(button.dataset.id)); }).catch(error => document.querySelector('#status').textContent = error.message); };
const cartPage = () => { document.querySelector('#app').innerHTML = `<section class="page-heading"><p class="eyebrow">Your selection</p><h1>Cart</h1><p>Review your pieces, then move through a simple two-step checkout.</p></section><section class="cart-layout"><div><div id="cart-items"></div><a class="back-link" href="/">← Continue shopping</a></div><aside class="summary"><h2>Order summary</h2><div class="total"><span>Total</span><strong id="cart-total">$0.00</strong></div><a class="primary" href="/checkout">Continue to checkout</a></aside></section>`; renderCart(); };
const checkoutPage = () => { document.querySelector('#app').innerHTML = `<section class="page-heading"><p class="eyebrow">Almost there</p><h1>Checkout</h1><p>Everything here is intentionally simple enough to edit during a workshop.</p></section><section class="checkout-layout"><form id="checkout"><fieldset><legend>1. Contact</legend><label>Email<input id="email" type="email" value="shopper@example.com" required></label></fieldset><fieldset><legend>2. Delivery</legend><div class="form-grid"><label>First name<input id="firstName" required></label><label>Last name<input id="lastName" required></label></div><label>Address<input id="address" required></label><div class="form-grid"><label>City<input id="city" required></label><label>Postal code<input id="postalCode" required></label></div></fieldset><fieldset><legend>3. Payment</legend><label>Card number<input id="cardNumber" inputmode="numeric" value="4242 4242 4242 4242" minlength="12" required></label><div class="form-grid"><label>Expiry<input value="12/30" required></label><label>CVV<input value="123" required></label></div></fieldset><button class="primary" type="submit">Pay and place order</button><p id="result"></p></form><aside class="summary"><h2>Your order</h2><div id="checkout-items"></div><div class="total"><span>Total</span><strong id="checkout-total">$0.00</strong></div><p class="muted">Secure demo payment. No real card is charged.</p></aside></section>`; const total = getCartTotal(); document.querySelector('#checkout-total').textContent = money(total); document.querySelector('#checkout-items').innerHTML = cart.map(item => { const currentPrice = getDiscountedPrice(item.product); return `<p>${item.product.name} × ${item.quantity}<b>${money(currentPrice * item.quantity)}</b></p>`; }).join(''); document.querySelector('#checkout').onsubmit = event => { event.preventDefault(); const result = document.querySelector('#result'); result.textContent = 'Processing payment...'; api(`/api/checkout?userId=${userId}`, { method: 'POST', body: JSON.stringify({ email: document.querySelector('#email').value, cardNumber: document.querySelector('#cardNumber').value, shipping: { firstName: document.querySelector('#firstName').value, lastName: document.querySelector('#lastName').value, address: document.querySelector('#address').value, city: document.querySelector('#city').value, postalCode: document.querySelector('#postalCode').value } }) }).then(order => { result.textContent = `Order ${order.orderId} paid. Transaction ${order.payment.transactionId}.`; cart = []; renderCount(); }).catch(error => { result.textContent = error.message; }); }; };
loadCart().then(() => { if (location.pathname === '/cart') cartPage(); else if (location.pathname === '/checkout') checkoutPage(); else shopPage(); });
