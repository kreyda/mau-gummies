/* MAU — product page: gallery, configurator, sticky add-to-bag, nutrition modal */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const M = window.MAU;

  /* ---------- gallery ---------- */
  const track = $('#galTrack');
  const slides = $$('.slide', track);
  const thumbs = $$('.gthumb');
  const dots = $$('.gal__dots i');
  const now = $('#galNow');
  let cur = 0;
  const setActive = i => {
    cur = i;
    thumbs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    now.textContent = String(i + 1).padStart(2, '0');
  };
  let lock = 0;
  const go = i => {
    i = (i + slides.length) % slides.length;
    lock = performance.now() + 900; // ignore scroll-sync while the smooth scroll runs
    track.scrollTo({ left: slides[i].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    setActive(i);
  };
  thumbs.forEach(t => t.addEventListener('click', () => go(+t.dataset.go)));
  $$('.gal__btn').forEach(b => b.addEventListener('click', () => go(cur + +b.dataset.step)));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
  });
  // sync on swipe
  let st;
  track.addEventListener('scroll', () => {
    clearTimeout(st);
    st = setTimeout(() => {
      if (performance.now() < lock) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== cur && slides[i]) setActive(i);
    }, 60);
  }, { passive: true });
  window.addEventListener('resize', () => { track.scrollLeft = slides[cur].offsetLeft; });

  /* ---------- configurator ---------- */
  const form = $('#pdpForm');
  const state = { qty: 1, plan: 'sub' };
  const q = s => $$(s, form);

  // flavors — only Fresh Berry is purchasable
  const flavMsg = $('#flavMsg');
  q('.flav').forEach(lab => {
    const input = $('input', lab);
    lab.addEventListener('click', e => {
      if (!input.hasAttribute('data-soon')) { flavMsg.hidden = true; return; }
      e.preventDefault();
      $('span', flavMsg).textContent = $('.flav__name', lab).textContent;
      flavMsg.hidden = false;
      lab.classList.remove('nudge'); void lab.offsetWidth; lab.classList.add('nudge');
    });
  });

  const syncSelected = name => q(`input[name="${name}"]`).forEach(i => i.closest('label').classList.toggle('is-selected', i.checked));

  const plural = n => `${n} ${n === 1 ? 'pouch' : 'pouches'}`;
  const words = ['', 'One pouch', 'Two pouches', 'Three pouches'];

  const update = () => {
    const { qty, plan } = state;
    const subTotal = M.unit('daily', 'sub', qty) * qty;
    const onceTotal = M.unit('daily', 'once', qty) * qty;
    const set = (k, v) => $$(`[data-price="${k}"]`).forEach(el => { el.textContent = v; });
    set('sub-total', M.money(subTotal));
    set('sub-compare', M.money(M.CFG.price.once * qty));
    set('sub-day', M.money(M.unit('daily', 'sub', qty) / M.CFG.days, 'day'));
    set('once-total', M.money(onceTotal));
    set('once-day', M.money(M.unit('daily', 'once', qty) / M.CFG.days, 'day'));
    [1, 2, 3].forEach(n => set(`each-${n}`, M.money(M.unit('daily', plan, n))));

    $('[data-sub-desc]').textContent = qty === 1 ? 'Delivered every 4 weeks' : `${plural(qty)} every 4 weeks`;
    $('[data-once-desc]').textContent = `${words[qty]} delivered once`;
    $('#qtyName').textContent = plural(qty);

    const starsSub = M.previewStars('sub', qty);
    const starsNow = M.previewStars(plan, qty);
    $$('[data-stars="sub"]').forEach(el => { el.textContent = M.fmtStars(starsSub); });
    $$('[data-stars="current"]').forEach(el => {
      const v = M.fmtStars(starsNow);
      if (el.textContent !== v) { el.textContent = v; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    });

    const price = M.money(plan === 'sub' ? subTotal : onceTotal);
    $('#addLabel').textContent = plan === 'sub' ? 'Start my mau' : 'Buy once';
    $('#addPrice').textContent = price;
    $('#atcPrice').textContent = price;
    $('#atcPriceM').textContent = price;
    $('#atcPlan').textContent = plan === 'sub'
      ? `Subscribe & Save · ${plural(qty)} · every 4 weeks`
      : `One-time · ${plural(qty)}`;

    // free-shipping row only promises what the chosen option delivers
    const ship = $('.ptrust li:first-child');
    ship.lastChild.textContent = plan === 'sub' ? 'Free shipping' : `Free shipping over ${M.money(M.CFG.freeShipOver)}`;
  };

  form.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'qty') { state.qty = +t.value; syncSelected('qty'); }
    if (t.name === 'plan') { state.plan = t.value; syncSelected('plan'); }
    update();
  });

  // query-string prefill, e.g. product.html?plan=once&qty=2
  const p = new URLSearchParams(location.search);
  if (['sub', 'once'].includes(p.get('plan'))) { state.plan = p.get('plan'); form.plan.value = state.plan; syncSelected('plan'); }
  if (['1', '2', '3'].includes(p.get('qty'))) { state.qty = +p.get('qty'); form.qty.value = p.get('qty'); syncSelected('qty'); }
  update();

  const addToBag = () => {
    M.add({ sku: 'daily', plan: state.plan, qty: state.qty });
    const btn = $('#addBtn');
    btn.classList.add('is-added');
    setTimeout(() => btn.classList.remove('is-added'), 900);
    M.open();
  };
  form.addEventListener('submit', e => { e.preventDefault(); addToBag(); });
  $('#atcBtn').addEventListener('click', addToBag);

  /* ---------- sticky add to bag ---------- */
  const atc = $('#atc');
  const atcBtn = $('#atcBtn');
  const mainCta = $('#addBtn');
  const footer = $('.footer');
  let atcTick = false;
  const checkAtc = () => {
    atcTick = false;
    const vh = window.innerHeight;
    const c = mainCta.getBoundingClientRect();
    const ctaIn = c.bottom > 0 && c.top < vh;
    const footIn = footer.getBoundingClientRect().top < vh;
    const desktop = window.innerWidth > 1024;
    // desktop: appears once the purchase CTA has scrolled past.
    // mobile/tablet: persistent whenever the main CTA is off-screen. Never over the footer.
    const on = !ctaIn && (!desktop || c.bottom < 0) && !footIn;
    if (on === atc.classList.contains('is-on')) return;
    atc.classList.toggle('is-on', on);
    atc.setAttribute('aria-hidden', String(!on));
    atcBtn.tabIndex = on ? 0 : -1;
  };
  const reqAtc = () => { if (!atcTick) { atcTick = true; requestAnimationFrame(checkAtc); } };
  window.addEventListener('scroll', reqAtc, { passive: true });
  window.addEventListener('resize', reqAtc);
  checkAtc();

  /* ---------- nutrition modal ---------- */
  const dlg = $('#nutri');
  $$('[data-open-nutri]').forEach(b => b.addEventListener('click', () => {
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }));
  $$('[data-close-nutri]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ---------- stars dashboard count-up ---------- */
  const num = $('.dash__num');
  const bar = $('#dash .bar__fill');
  if (num && 'IntersectionObserver' in window && !reduce) {
    const target = +num.dataset.count;
    num.textContent = '0';
    bar.style.setProperty('--run', '0');
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1600;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        num.textContent = Math.round(target * e).toLocaleString('en-US');
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      bar.style.setProperty('--run', '1');
      $$('#dash .dash__days i').forEach((d, i) => setTimeout(() => d.classList.add('on'), 200 + i * 60));
    }, { threshold: 0.35 });
    io.observe($('#dash'));
  } else {
    $$('#dash .dash__days i').forEach(d => d.classList.add('on'));
  }
})();
