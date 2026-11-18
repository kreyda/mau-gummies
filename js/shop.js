/* MAU — shared shop logic: pricing, cart state, cart drawer + /cart page
   ----------------------------------------------------------------------
   PRICING IS PLACEHOLDER. Every amount on screen renders as $XX / $X.XX
   until real prices are supplied. The numbers below are DEMO values used
   only so progress bars, savings and MAU Stars behave realistically.
   Preview them with ?prices=demo (and ?prices=placeholder to switch back). */
(() => {
  const CFG = {
    days: 28,                          // supply per pouch
    price: { once: 42, sub: 35 },      // DEMO per-pouch prices
    bundle: { 1: 0, 2: 0.05, 3: 0.10 },// DEMO extra saving for 2 / 3+ pouches
    shipping: 5.95,                    // DEMO one-time shipping
    freeShipOver: 60,                  // DEMO free-shipping threshold (one-time)
    starsPerDollar: 100,               // $1 USD = 100 MAU Stars (brand rule)
    subBonusStars: 1500,               // DEMO bonus per subscribed pouch
    maxQty: 6,
    products: {
      daily:  { name: 'MAU Daily Superfood Bear Gummies', flavor: 'Fresh Berry', img: 'assets/mau-pack.webp', bg: 'var(--coral)' },
      travel: { name: 'Travel pack', flavor: '7 daily sachets', img: 'assets/sachet.svg', bg: 'var(--forest-2)', price: 12, onceOnly: true },
    },
  };

  /* ---------- placeholder vs demo display ---------- */
  const params = new URLSearchParams(location.search);
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { return null; } };
  if (params.get('prices') === 'demo') store('mau.demo', '1');
  if (params.get('prices') === 'placeholder') store('mau.demo', null);
  const DEMO = store('mau.demo') === '1';

  const money = (v, kind = 'amt') => {
    if (!DEMO) return kind === 'day' || kind === 'small' ? '$X.XX' : '$XX';
    return '$' + (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, '');
  };
  const pct = v => DEMO ? Math.round(v * 100) + '%' : 'XX%';
  const fmtStars = n => Math.round(n).toLocaleString('en-US');
  const round50 = n => Math.round(n / 50) * 50;

  /* ---------- pricing ---------- */
  const unit = (sku, plan, qty) => {
    const p = CFG.products[sku];
    if (p.price) return p.price;
    const base = CFG.price[plan];
    const b = CFG.bundle[Math.min(qty, 3)] || 0;
    return base * (1 - b);
  };
  const lineTotal = l => unit(l.sku, l.plan, l.qty) * l.qty;
  const lineCompare = l => (CFG.products[l.sku].price || CFG.price.once) * l.qty;
  const lineStars = l => round50(lineTotal(l) * CFG.starsPerDollar + (l.plan === 'sub' ? CFG.subBonusStars * l.qty : 0));
  const subSaving = qty => 1 - (CFG.price.sub * (1 - (CFG.bundle[Math.min(qty, 3)] || 0))) / CFG.price.once;

  /* ---------- cart state ---------- */
  const KEY = 'mau.cart.v1';
  let mem = [];
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : mem; } catch (e) { return mem; } };
  const save = c => { mem = c; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} };
  let cart = load();

  const totals = (c = cart) => {
    const subtotal = c.reduce((s, l) => s + lineCompare(l), 0);
    const total0 = c.reduce((s, l) => s + lineTotal(l), 0);
    const discount = subtotal - total0;
    const hasSub = c.some(l => l.plan === 'sub');
    const free = hasSub || total0 >= CFG.freeShipOver;
    const shipping = c.length ? (free ? 0 : CFG.shipping) : 0;
    const stars = c.reduce((s, l) => s + lineStars(l), 0);
    const count = c.reduce((s, l) => s + l.qty, 0);
    return { subtotal, discount, shipping, total: total0 + shipping, items: total0, stars, count, hasSub, free, toFree: Math.max(0, CFG.freeShipOver - total0) };
  };

  const listeners = new Set();
  const commit = (next, opts = {}) => { cart = next; save(cart); listeners.forEach(fn => fn(opts)); };

  const api = {
    add({ sku = 'daily', plan = 'sub', qty = 1 }) {
      const c = cart.map(l => ({ ...l }));
      const hit = c.find(l => l.sku === sku && l.plan === plan);
      if (hit) hit.qty = Math.min(CFG.maxQty, hit.qty + qty);
      else c.push({ id: sku + '-' + plan, sku, plan, qty: Math.min(CFG.maxQty, qty) });
      commit(c, { flash: sku + '-' + plan });
    },
    setQty(id, qty) {
      if (qty < 1) return api.remove(id);
      commit(cart.map(l => l.id === id ? { ...l, qty: Math.min(CFG.maxQty, qty) } : l));
    },
    remove(id) { commit(cart.filter(l => l.id !== id), { removed: id }); },
    setPlan(id, plan) {
      const line = cart.find(l => l.id === id);
      if (!line || line.plan === plan) return;
      let c = cart.filter(l => l.id !== id);
      const twin = c.find(l => l.sku === line.sku && l.plan === plan);
      if (twin) c = c.map(l => l === twin ? { ...l, qty: Math.min(CFG.maxQty, l.qty + line.qty) } : l);
      else c.splice(cart.indexOf(line), 0, { ...line, id: line.sku + '-' + plan, plan });
      commit(c, { flash: line.sku + '-' + plan });
    },
    on(fn) { listeners.add(fn); },
    get cart() { return cart; },
    totals, money, pct, fmtStars, unit, lineStars, subSaving, CFG, DEMO,
    previewStars: (plan, qty) => lineStars({ sku: 'daily', plan, qty }),
  };
  window.MAU = api;

  // keep tabs in sync
  window.addEventListener('storage', e => { if (e.key === KEY) { cart = load(); listeners.forEach(fn => fn({})); } });

  /* ---------- templates ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  const tplShip = t => {
    const p = t.free ? 1 : Math.min(1, t.items / CFG.freeShipOver);
    const msg = t.free
      ? `${ico('i-truck')}<span>You’ve unlocked <b>free shipping</b></span>`
      : `${ico('i-truck')}<span>You’re <b>${money(t.toFree)}</b> away from free shipping</span>`;
    return `<div class="ship ${t.free ? 'is-free' : ''}"><p class="ship__msg">${msg}</p><div class="ship__bar" role="progressbar" aria-label="Free shipping progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}"><span style="--p:${p.toFixed(3)}"></span></div></div>`;
  };

  const tplItem = (l, flash) => {
    const p = CFG.products[l.sku];
    const sub = l.plan === 'sub';
    const planName = sub ? 'Subscribe &amp; Save' : 'One-time purchase';
    const canEdit = !p.onceOnly;
    return `<li class="line ${flash === l.id ? 'is-new' : ''}" data-id="${l.id}">
      <span class="line__thumb" style="--bg:${p.bg}"><img src="${p.img}" alt=""></span>
      <div class="line__body">
        <div class="line__top">
          <p class="line__name">${esc(p.name)}</p>
          <p class="line__price"><b>${money(lineTotal(l))}</b>${sub ? `<s>${money(lineCompare(l))}</s>` : ''}</p>
        </div>
        <dl class="line__meta mono">
          <div><dt>${l.sku === 'daily' ? 'Flavor' : 'Pack'}</dt><dd>${esc(p.flavor)}</dd></div>
          <div><dt>Purchase</dt><dd>${planName}${sub ? ` <span class="line__save">Save ${pct(subSaving(l.qty))}</span>` : ''}</dd></div>
          <div><dt>Delivery</dt><dd>${sub ? 'Every 4 weeks' : 'Once'}</dd></div>
        </dl>
        <div class="line__ctrl">
          <div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-act="dec" aria-label="Decrease quantity">${ico('i-minus')}</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-act="inc" aria-label="Increase quantity" ${l.qty >= CFG.maxQty ? 'disabled' : ''}>${ico('i-plus')}</button>
          </div>
          <div class="line__links mono">
            ${canEdit ? `<button type="button" data-act="edit" aria-expanded="false">Edit</button>` : ''}
            <button type="button" data-act="remove">Remove</button>
          </div>
        </div>
        ${canEdit ? `<div class="line__edit" hidden>
          <p class="mono">Purchase type</p>
          <div class="seg">
            <button type="button" data-act="plan" data-plan="sub" aria-pressed="${sub}">Subscribe &amp; Save</button>
            <button type="button" data-act="plan" data-plan="once" aria-pressed="${!sub}">One-time</button>
          </div>
        </div>` : ''}
      </div>
    </li>`;
  };

  const tplItems = (c, flash) => c.length
    ? `<ul class="lines">${c.map(l => tplItem(l, flash)).join('')}</ul>`
    : `<div class="empty">
        <img class="empty__g" src="assets/gummy-berry.svg" alt="">
        <p class="d empty__t">Your bag is <em class="it">empty.</em></p>
        <p>Your daily mau is one tap away.</p>
        <a class="btn btn--lime btn--lg" href="product.html">Shop MAU ${ico('i-arrow')}</a>
      </div>`;

  const tplStars = t => t.count ? `<div class="cstars">
      <span class="cstars__ic">${ico('i-star')}</span>
      <div><p class="cstars__t">You’ll earn <b>${fmtStars(t.stars)}</b> MAU Stars</p>
      <p class="cstars__s">Stars will appear in your account after your order is confirmed.</p></div>
    </div>` : '';

  const tplUpsell = c => {
    const once = c.find(l => l.sku === 'daily' && l.plan === 'once');
    if (!once || c.some(l => l.plan === 'sub')) return '';
    return `<div class="upsell" data-id="${once.id}">
      <img class="upsell__g" src="assets/gummy-berry.svg" alt="">
      <div class="upsell__txt">
        <p class="d upsell__t">Make it monthly. <em class="it">Save more.</em></p>
        <p>Switch to Subscribe &amp; Save for a better price, free shipping and bonus MAU Stars.</p>
      </div>
      <button class="btn btn--forest btn--sm" type="button" data-act="upgrade">Switch to subscription</button>
    </div>`;
  };

  const tplCross = c => {
    if (!c.length || c.some(l => l.sku === 'travel')) return '';
    return `<div class="cross">
      <span class="cross__thumb">${'<img src="assets/sachet.svg" alt="">'}</span>
      <div class="cross__txt"><p class="cross__k mono">Add a travel pack</p><p><b>7 daily sachets</b> for bags, desks and weekends away.</p></div>
      <button class="cross__add" type="button" data-act="cross" aria-label="Add travel pack">${ico('i-plus')}<span>${money(CFG.products.travel.price)}</span></button>
    </div>`;
  };

  const rows = t => `
        <div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>${t.shipping === 0 ? '<b class="summary__free">Free</b>' : money(t.shipping, 'small')}</dd></div>
        ${t.discount > 0.001 ? `<div class="summary__disc"><dt>Discount</dt><dd>−${money(t.discount)}</dd></div>` : ''}`;
  const totalRow = t => `<div class="summary__total"><dt>Total</dt><dd>${money(t.total)}</dd></div>`;
  const checkout = t => `
      <button class="btn btn--lime btn--xl btn--block summary__cta" type="button" data-act="checkout">${ico('i-lock')}<span>Checkout · ${money(t.total)}</span></button>
      <p class="summary__note mono" data-checkout-note hidden>Checkout connects at launch — this is a preview.</p>
      <p class="summary__trust mono">${ico('i-shield')}30-day guarantee<span aria-hidden="true">·</span>${ico('i-lock')}Secure checkout</p>`;
  const express = `<div class="express">
        <p class="express__k mono"><span>or express checkout</span></p>
        <div class="express__btns">
          <button type="button" class="express__btn express__btn--dark" data-act="checkout" aria-label="Apple Pay (placeholder)"><b>Apple Pay</b></button>
          <button type="button" class="express__btn" data-act="checkout" aria-label="Google Pay (placeholder)"><b>Google Pay</b></button>
        </div>
      </div>`;

  // full summary (/cart page)
  const tplSummary = t => t.count ? `<div class="summary">
      <p class="summary__h d">Order summary</p>
      <dl class="summary__rows">${rows(t)}${totalRow(t)}</dl>
      <p class="summary__tax mono">Taxes calculated at checkout</p>
      ${checkout(t)}${express}
    </div>` : '';
  // drawer: breakdown scrolls with the bag, total + checkout stay pinned
  const tplBreakdown = t => t.count ? `<div class="breakdown">
      <dl class="summary__rows">${rows(t)}</dl>
      <p class="summary__tax mono">Taxes calculated at checkout</p>
      ${express}
      <a class="summary__full mono" href="cart.html">View full bag</a>
    </div>` : '';
  const tplPinned = t => t.count ? `<div class="summary summary--pinned">
      <dl class="summary__rows">${totalRow(t)}</dl>
      ${checkout(t)}
    </div>` : '';

  /* ---------- render into a root (drawer or page) ---------- */
  const render = (root, place, opts = {}) => {
    const t = totals();
    const slot = n => root.querySelector(`[data-slot="${n}"]`);
    const set = (n, html) => { const el = slot(n); if (el) el.innerHTML = html; };
    set('ship', cart.length ? tplShip(t) : '');
    set('items', tplItems(cart, opts.flash));
    set('stars', tplStars(t));
    set('upsell', tplUpsell(cart));
    set('cross', tplCross(cart));
    set('summary', tplSummary(t));
    set('breakdown', tplBreakdown(t));
    set('pinned', tplPinned(t));
    set('count', `${t.count} ${t.count === 1 ? 'item' : 'items'}`);
    root.classList.toggle('is-empty', !cart.length);
  };

  /* ---------- delegated actions ---------- */
  const bindActions = root => root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const line = b.closest('[data-id]');
    const id = line && line.dataset.id;
    const l = cart.find(x => x.id === id);
    switch (b.dataset.act) {
      case 'inc': l && api.setQty(id, l.qty + 1); break;
      case 'dec': l && api.setQty(id, l.qty - 1); break;
      case 'remove': api.remove(id); break;
      case 'edit': {
        const ed = line.querySelector('.line__edit');
        ed.hidden = !ed.hidden; b.setAttribute('aria-expanded', String(!ed.hidden));
        b.textContent = ed.hidden ? 'Edit' : 'Done';
        break;
      }
      case 'plan': api.setPlan(id, b.dataset.plan); break;
      case 'upgrade': api.setPlan(id, 'sub'); break;
      case 'cross': api.add({ sku: 'travel', plan: 'once', qty: 1 }); break;
      case 'checkout': {
        const note = root.querySelector('[data-checkout-note]');
        if (note) note.hidden = false;
        break;
      }
    }
  });

  /* ---------- drawer ---------- */
  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'drawer';
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="drawer__scrim" data-close></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" tabindex="-1">
      <header class="drawer__head">
        <h2 class="d drawer__title" id="drawerTitle">Your <em class="it">bag</em></h2>
        <span class="drawer__count mono"></span>
        <button class="drawer__close" type="button" data-close aria-label="Close bag">${ico('i-close')}</button>
      </header>
      <div class="drawer__body" data-cart-root>
        <div data-slot="ship"></div>
        <div data-slot="items"></div>
        <div data-slot="stars"></div>
        <div data-slot="upsell"></div>
        <div data-slot="cross"></div>
        <div data-slot="breakdown"></div>
      </div>
      <footer class="drawer__foot" data-cart-root><div data-slot="pinned"></div></footer>
    </aside>`;
  document.body.appendChild(drawer);
  const panel = drawer.querySelector('.drawer__panel');
  const roots = [...drawer.querySelectorAll('[data-cart-root]')];
  roots.forEach(bindActions);

  let lastFocus = null;
  const openDrawer = () => {
    if (!drawer.hidden && drawer.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('drawer-lock');
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
    setTimeout(() => drawer.querySelector('.drawer__close').focus({ preventScroll: true }), 60);
  };
  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('drawer-lock');
    setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  api.open = openDrawer; api.close = closeDrawer;
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', e => {
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') { // simple focus trap
      const f = [...panel.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]')].filter(x => x.offsetParent !== null && !x.closest('[hidden]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const onCartPage = document.body.classList.contains('page-cart');
  document.querySelectorAll('[data-cart-open]').forEach(a => a.addEventListener('click', e => {
    if (onCartPage) return; // already on the full bag
    e.preventDefault(); openDrawer();
  }));

  /* ---------- page root (/cart) ---------- */
  const pageRoot = document.querySelector('main [data-cart-root]');
  if (pageRoot) bindActions(pageRoot);
  const pageCount = document.querySelector('.cartpage__count');

  /* ---------- badge + render loop ---------- */
  const badges = [...document.querySelectorAll('[data-cart-count]')];
  const refresh = (opts = {}) => {
    const t = totals();
    roots.forEach(r => render(r, 'drawer', opts));
    if (pageRoot) render(pageRoot, 'page', opts);
    const label = `${t.count} ${t.count === 1 ? 'item' : 'items'}`;
    if (pageCount) pageCount.textContent = label;
    drawer.querySelector('.drawer__count').textContent = label;
    badges.forEach(b => {
      const changed = b.textContent !== String(t.count);
      b.textContent = t.count;
      b.closest('a').setAttribute('aria-label', `Bag, ${t.count} ${t.count === 1 ? 'item' : 'items'}`);
      if (changed && opts.flash) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
  };
  api.on(refresh);
  refresh();

  /* ---------- demo-price badge ---------- */
  if (DEMO) {
    const tag = document.createElement('a');
    tag.className = 'demo-flag mono';
    tag.href = '?prices=placeholder';
    tag.title = 'Switch back to placeholder prices';
    tag.textContent = 'Demo prices · not final';
    document.body.appendChild(tag);
  }

  /* ---------- homepage buy form → bag ---------- */
  const homePlans = document.getElementById('plans');
  if (homePlans) {
    homePlans.addEventListener('submit', e => {
      e.preventDefault();
      const plan = (homePlans.querySelector('input[name="plan"]:checked') || {}).value || 'sub';
      api.add({ sku: 'daily', plan, qty: 1 });
      openDrawer();
    });
  }
})();
