/* MAU — customer account
   Front-end prototype: data below is demo content for "Alex".
   Subscription changes persist in localStorage so flows can be tried end to end. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const R = document.body.dataset.root || '../';
  const page = document.body.dataset.page;
  const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- dates (demo "today") ---------- */
  const TODAY = new Date('2026-11-18T12:00:00');
  const D = iso => new Date(iso + 'T12:00:00');
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (isoStr, n) => { const d = D(isoStr); d.setDate(d.getDate() + n); return iso(d); };
  const long = isoStr => D(isoStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const short = isoStr => D(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const full = isoStr => D(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  /* ---------- storage ---------- */
  const get = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch (e) { return f; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let tt;
  const toast = msg => {
    $('span', toastEl).textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
  };

  /* ---------- account menu ---------- */
  const whoBtn = $('.who__btn'), whoMenu = $('#whoMenu');
  const setWho = open => { whoMenu.hidden = !open; whoBtn.setAttribute('aria-expanded', String(open)); };
  whoBtn.addEventListener('click', e => { e.stopPropagation(); setWho(whoMenu.hidden); });
  document.addEventListener('click', e => { if (!whoMenu.hidden && !e.target.closest('.who')) setWho(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !whoMenu.hidden) { setWho(false); whoBtn.focus(); } });

  /* ---------- mobile menu ---------- */
  const mBtn = $('.top__menu'), mMenu = $('#mmenu');
  const setMenu = open => {
    mMenu.hidden = !open; mBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) $('[data-close-menu].modal__x', mMenu).focus();
  };
  mBtn.addEventListener('click', () => setMenu(true));
  $$('[data-close-menu]', mMenu).forEach(b => b.addEventListener('click', () => { setMenu(false); mBtn.focus(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mMenu.hidden) setMenu(false); });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- modal ---------- */
  const dlg = $('#modal'), box = $('#modalBox');
  const modal = ({ title, sub = '', body = '', foot = '' }) => {
    box.innerHTML = `
      <div class="modal__head"><div><h2 id="modalTitle">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
        <button class="modal__x" type="button" data-x aria-label="Close">${ico('i-close')}</button></div>
      <div class="modal__body">${body}</div>
      ${foot ? `<div class="modal__foot">${foot}</div>` : ''}`;
    if (!dlg.open) dlg.showModal();
    const first = $('input:not([disabled]), select, textarea', box) || $('.modal__foot button:last-child', box) || $('[data-x]', box);
    first && first.focus();
  };
  const closeModal = () => dlg.open && dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-x]')) closeModal(); });

  /* ---------- referral link ---------- */
  const handle = () => get('mau.handle', 'alex');
  const refUrl = () => `https://mau.com/${handle()}`;
  const paintRef = () => $$('[data-ref-url]').forEach(el => { el.textContent = `mau.com/${handle()}`; });
  paintRef();

  const copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  };
  document.addEventListener('click', async e => {
    const c = e.target.closest('[data-copy-link]');
    if (c) {
      const ok = await copy(refUrl());
      toast(ok ? 'Link copied' : `Your link: mau.com/${handle()}`);
      const label = $('span', c);
      if (label && c.classList.contains('btn')) {
        const was = label.textContent; c.classList.add('is-done'); label.textContent = 'Copied';
        setTimeout(() => { c.classList.remove('is-done'); label.textContent = was; }, 1600);
      }
      return;
    }
    const s = e.target.closest('[data-share]');
    if (s) {
      const data = { title: 'MAU', text: 'I’ve been taking MAU daily superfood gummies — here’s my link if you want to try them.', url: refUrl() };
      if (navigator.share) { try { await navigator.share(data); } catch (_) {} }
      else { await copy(refUrl()); toast('Link copied — paste it anywhere'); }
      return;
    }
    if (e.target.closest('[data-qr]')) openQR();
  });

  const openQR = () => {
    modal({
      title: 'Your MAU QR code', sub: 'Scan to open your link. Great for printing or showing in person.',
      body: `<div class="qr" id="qrBox" aria-label="QR code for mau.com/${esc(handle())}"></div><p class="small muted" style="text-align:center">mau.com/${esc(handle())}</p>`,
      foot: `<button class="abtn" type="button" data-x>Close</button><button class="btn btn--lime" type="button" id="qrDl">${ico('i-arrow')}Download PNG</button>`,
    });
    const el = $('#qrBox');
    if (window.QRCode) {
      new window.QRCode(el, { text: refUrl(), width: 440, height: 440, colorDark: '#173A28', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
    } else {
      el.innerHTML = '<p class="small muted">QR code couldn’t load. Check your connection and try again.</p>';
    }
    $('#qrDl').addEventListener('click', () => {
      const cv = $('canvas', el);
      if (!cv) return;
      const a = Object.assign(document.createElement('a'), { href: cv.toDataURL('image/png'), download: `mau-${handle()}-qr.png` });
      a.click();
    });
  };

  /* ---------- subscription state ---------- */
  const SUB_DEFAULT = {
    status: 'active', qty: 1, flavor: 'Fresh Berry', freq: 4, nextCharge: '2026-12-10',
    pay: 'Visa ending 4242',
    addr: { name: 'Alex M.', line1: '120 Example St', line2: 'Apt 4', city: 'Brooklyn', state: 'NY', zip: '11201' },
  };
  let sub = { ...SUB_DEFAULT, ...get('mau.sub.v1', {}) };
  const saveSub = patch => { sub = { ...sub, ...patch }; put('mau.sub.v1', sub); paintSub(); };
  const shipOf = c => addDays(c, 2);
  const addrLine = a => [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(', ');

  const subView = () => {
    const ship = shipOf(sub.nextCharge);
    const v = {
      flavor: sub.flavor,
      qtyLabel: `${sub.qty} ${sub.qty === 1 ? 'pouch' : 'pouches'}`,
      freqLabel: `Every ${sub.freq} weeks`,
      nextChargeLong: long(sub.nextCharge),
      nextShipLong: long(ship),
      pay: sub.pay,
      addr: addrLine(sub.addr),
      addrShort: `${sub.addr.name} · ${sub.addr.city}, ${sub.addr.state}`,
      summary: `${sub.flavor} · ${sub.qty} ${sub.qty === 1 ? 'pouch' : 'pouches'}`,
    };
    if (sub.status === 'paused') {
      Object.assign(v, { nextChargeLong: '—', nextShipLong: 'Paused', summary: `Resumes ${long(ship)}` });
    }
    if (sub.status === 'cancelled') {
      Object.assign(v, { nextChargeLong: '—', nextShipLong: 'No delivery', summary: 'Subscription cancelled' });
    }
    return v;
  };

  const paintSub = () => {
    const v = subView();
    $$('[data-sub]').forEach(el => {
      const k = el.dataset.sub;
      if (k in v) el.textContent = v[k];
    });
    // overview card: a paused/cancelled state shouldn't look like a date
    $$('[data-sub-card] .metric__v').forEach(el => { el.style.fontSize = sub.status === 'active' ? '' : '2.1rem'; });
    $$('[data-next-ship]').forEach(el => {
      el.closest('p').innerHTML = sub.status === 'active'
        ? `Running low? Your next pouch ships <b data-next-ship>${short(shipOf(sub.nextCharge))}</b>.`
        : sub.status === 'paused' ? `Your subscription is paused until <b data-next-ship>${short(shipOf(sub.nextCharge))}</b>.`
        : `Want MAU again? <b data-next-ship>Restart anytime</b>.`;
    });
    const pill = $('[data-sub="statusPill"]');
    if (pill) {
      const map = { active: ['Active', 'pill--ok'], paused: ['Paused', 'pill--paused'], cancelled: ['Cancelled', 'pill--off'] };
      const [t, c] = map[sub.status];
      pill.textContent = t; pill.className = `pill ${c}`;
    }
    const note = $('[data-sub="note"]');
    if (note) {
      note.hidden = sub.status === 'active';
      note.textContent = sub.status === 'paused'
        ? `Paused. Your next delivery ships ${long(shipOf(sub.nextCharge))}, and we’ll charge you on ${long(sub.nextCharge)}. Resume early anytime.`
        : `Cancelled. You won’t be charged again, and you keep all your MAU Stars.`;
    }
    const acts = $('[data-sub="actions"]');
    if (acts) {
      acts.innerHTML = sub.status === 'active' ? `
          <button class="abtn" type="button" data-m="skip">${ico('i-skip')}Skip next delivery</button>
          <button class="abtn" type="button" data-m="date">${ico('i-cal')}Change delivery date</button>
          <button class="abtn" type="button" data-m="qty">${ico('i-box')}Change quantity</button>
          <button class="abtn" type="button" data-m="pause">${ico('i-pause')}Pause subscription</button>
          <button class="abtn abtn--danger" type="button" data-m="cancel">Cancel subscription</button>`
        : sub.status === 'paused' ? `
          <button class="btn btn--lime btn--sm" type="button" data-m="resume">${ico('i-repeat')}Resume now</button>
          <button class="abtn" type="button" data-m="date">${ico('i-cal')}Change resume date</button>
          <button class="abtn abtn--danger" type="button" data-m="cancel">Cancel subscription</button>`
        : `
          <button class="btn btn--lime btn--sm" type="button" data-m="resume">${ico('i-repeat')}Restart subscription</button>
          <a class="abtn" href="${R}product.html">${ico('i-bag')}Buy once</a>`;
    }
    // detail rows can only be edited on an active/paused subscription
    $$('.edit-rows [data-m]').forEach(b => { b.disabled = sub.status === 'cancelled'; });
  };
  paintSub();

  /* ---------- modal flows ---------- */
  const yes = (label, cls = 'btn btn--lime') => `<button class="${cls}" type="button" data-ok>${label}</button>`;
  const no = (label = 'Cancel') => `<button class="abtn" type="button" data-x>${label}</button>`;
  const onOk = fn => { const b = $('[data-ok]', box); b && b.addEventListener('click', fn); };
  const choice = (name, opts, cur) => `<div class="choice" role="radiogroup">${opts.map(o =>
    `<label class="${o.soon ? 'is-soon' : ''}"><input type="radio" name="${name}" value="${esc(o.v)}" ${o.v == cur ? 'checked' : ''} ${o.soon ? 'disabled' : ''}>${esc(o.t)}${o.note ? `<small>${o.note}</small>` : ''}</label>`).join('')}</div>`;
  const picked = name => ($(`input[name="${name}"]:checked`, box) || {}).value;

  const flows = {
    skip() {
      const nextC = addDays(sub.nextCharge, sub.freq * 7);
      modal({
        title: 'Skip your next delivery?',
        body: `<p>Your <b>${long(shipOf(sub.nextCharge))}</b> delivery will be skipped and you won’t be charged on ${long(sub.nextCharge)}.</p>
               <div class="callout">${ico('i-cal')}<span>Your next delivery will be <b>${long(shipOf(nextC))}</b>.</span></div>`,
        foot: no('Keep delivery') + yes('Skip delivery'),
      });
      onOk(() => { saveSub({ nextCharge: nextC }); closeModal(); toast(`Skipped. Next delivery ${short(shipOf(nextC))}`); });
    },
    date() {
      const min = addDays(iso(TODAY), 3), max = addDays(iso(TODAY), 70);
      modal({
        title: sub.status === 'paused' ? 'Change resume date' : 'Change delivery date',
        sub: 'Pick the day you’d like your next pouch to arrive. We charge 2 days before it ships.',
        body: `<div class="field"><label for="mDate">Delivery date</label><input class="input" id="mDate" type="date" min="${min}" max="${max}" value="${shipOf(sub.nextCharge)}"></div>
               <p class="small muted" id="mDateNote"></p>`,
        foot: no() + yes('Save date'),
      });
      const inp = $('#mDate', box), note = $('#mDateNote', box);
      const upd = () => { note.textContent = inp.value ? `You’ll be charged on ${long(addDays(inp.value, -2))}.` : ''; };
      inp.addEventListener('input', upd); upd();
      onOk(() => {
        if (!inp.value || inp.value < min || inp.value > max) { inp.reportValidity(); return; }
        saveSub({ nextCharge: addDays(inp.value, -2) }); closeModal(); toast(`Delivery moved to ${short(inp.value)}`);
      });
    },
    qty() {
      let q = sub.qty;
      modal({
        title: 'Change quantity', sub: 'How many pouches in each delivery?',
        body: `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                 <div class="stepper-lg"><button type="button" data-d="-1" aria-label="Fewer pouches">${ico('i-minus')}</button><output id="mQty" aria-live="polite">${q}</output><button type="button" data-d="1" aria-label="More pouches">${ico('i-plus')}</button></div>
                 <span id="mQtyL" style="font-weight:650"></span></div>
               <p class="small muted">Price per delivery: <b>$XX</b> · 2+ pouches save more <span class="ph">[final pricing TBC]</span></p>`,
        foot: no() + yes('Save quantity'),
      });
      const out = $('#mQty', box), lab = $('#mQtyL', box);
      const paint = () => {
        out.textContent = q; lab.textContent = q === 1 ? 'pouch per delivery' : 'pouches per delivery';
        $('[data-d="-1"]', box).disabled = q <= 1; $('[data-d="1"]', box).disabled = q >= 6;
      };
      $$('[data-d]', box).forEach(b => b.addEventListener('click', () => { q = Math.max(1, Math.min(6, q + +b.dataset.d)); paint(); }));
      paint();
      onOk(() => { saveSub({ qty: q }); closeModal(); toast(`Quantity updated to ${q} ${q === 1 ? 'pouch' : 'pouches'}`); });
    },
    flavor() {
      modal({
        title: 'Change flavor', sub: 'More flavours are on the way.',
        body: choice('flavor', [
          { v: 'Fresh Berry', t: 'Fresh Berry' },
          { v: 'Citrus Glow', t: 'Citrus Glow', soon: 1, note: 'Coming soon' },
          { v: 'Tropical', t: 'Tropical', soon: 1, note: 'Coming soon' },
          { v: 'Cherry Lime', t: 'Cherry Lime', soon: 1, note: 'Coming soon' },
        ], sub.flavor),
        foot: no() + yes('Save flavor'),
      });
      onOk(() => { saveSub({ flavor: picked('flavor') }); closeModal(); toast('Flavor saved'); });
    },
    freq() {
      modal({
        title: 'Delivery frequency', sub: 'One pouch is a 28-day supply.',
        body: choice('freq', [
          { v: 2, t: 'Every 2 weeks' }, { v: 4, t: 'Every 4 weeks', note: 'Recommended' },
          { v: 6, t: 'Every 6 weeks' }, { v: 8, t: 'Every 8 weeks' },
        ], sub.freq),
        foot: no() + yes('Save frequency'),
      });
      onOk(() => { const f = +picked('freq'); saveSub({ freq: f }); closeModal(); toast(`Deliveries every ${f} weeks`); });
    },
    pay() {
      modal({
        title: 'Payment method', sub: 'Used for your subscription and new orders.',
        body: choice('pay', [{ v: sub.pay, t: sub.pay, note: 'Default' }], sub.pay) +
          `<div class="callout">${ico('i-lock')}<span>New cards are added on our payment provider’s secure page, so MAU never sees your full card number. <span class="ph">[Connects at launch]</span></span></div>`,
        foot: no('Close') + `<button class="btn btn--lime" type="button" disabled style="opacity:.5">${ico('i-plus')}Add a new card</button>`,
      });
    },
    addr() {
      const a = sub.addr;
      const f = (id, l, v, ac, full) => `<div class="field ${full ? 'field--full' : ''}"><label for="${id}">${l}</label><input class="input" id="${id}" value="${esc(v)}" autocomplete="${ac}" ${id !== 'aL2' ? 'required' : ''}></div>`;
      modal({
        title: 'Shipping address', sub: 'Your subscription and new orders ship here.',
        body: `<form class="form" id="addrForm" novalidate>
          ${f('aName', 'Full name', a.name, 'name', 1)}${f('aL1', 'Street address', a.line1, 'address-line1', 1)}
          ${f('aL2', 'Apartment, suite (optional)', a.line2, 'address-line2', 1)}${f('aCity', 'City', a.city, 'address-level2')}
          ${f('aState', 'State', a.state, 'address-level1')}${f('aZip', 'ZIP code', a.zip, 'postal-code')}</form>`,
        foot: no() + yes('Save address'),
      });
      onOk(() => {
        const form = $('#addrForm', box);
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const v = id => $('#' + id, box).value.trim();
        saveSub({ addr: { name: v('aName'), line1: v('aL1'), line2: v('aL2'), city: v('aCity'), state: v('aState'), zip: v('aZip') } });
        closeModal(); toast('Address saved');
      });
    },
    pause() {
      const opt = n => addDays(sub.nextCharge, n * 28);
      modal({
        title: 'Pause your subscription', sub: 'Take a break. Nothing ships and you won’t be charged while paused.',
        body: choice('pause', [1, 2, 3].map(n => ({ v: n, t: `${n} month${n > 1 ? 's' : ''}`, note: `Back ${short(shipOf(opt(n)))}` })), 1),
        foot: no('Keep it active') + yes('Pause subscription'),
      });
      onOk(() => { const n = +picked('pause'); saveSub({ status: 'paused', nextCharge: opt(n) }); closeModal(); toast(`Paused until ${short(shipOf(opt(n)))}`); });
    },
    resume() {
      const c = addDays(iso(TODAY), 1);
      const restart = sub.status === 'cancelled';
      modal({
        title: restart ? 'Restart your subscription?' : 'Resume your subscription?',
        body: `<p>${sub.qty} ${sub.qty === 1 ? 'pouch' : 'pouches'} of ${esc(sub.flavor)}, every ${sub.freq} weeks.</p>
               <div class="callout">${ico('i-truck')}<span>Your next delivery ships <b>${long(shipOf(c))}</b>. You’ll be charged on ${long(c)}.</span></div>`,
        foot: no('Not now') + yes(restart ? 'Restart subscription' : 'Resume now'),
      });
      onOk(() => { saveSub({ status: 'active', nextCharge: c }); closeModal(); toast(restart ? 'Welcome back! Subscription restarted' : 'Subscription resumed'); });
    },
    cancel() {
      modal({
        title: 'Cancel your subscription?',
        body: `<ul class="earn-list">
                 <li><span class="ic ic--box">${ico('i-box')}</span><p>No more deliveries or charges<span class="small">Effective immediately. Nothing ships on ${long(shipOf(sub.nextCharge))}.</span></p><span></span></li>
                 <li><span class="ic ic--star">${ico('i-star-f')}</span><p>You keep your Stars<span class="small">All 18,450 stay in your account.</span></p><span></span></li>
                 <li><span class="ic ic--user">${ico('i-repeat')}</span><p>Restart anytime<span class="small">One tap from this page.</span></p><span></span></li>
               </ul>
               <div class="field"><label for="cReason">Anything we could do better? <span class="muted">(optional)</span></label>
                 <select class="select" id="cReason"><option value="">Choose a reason</option><option>Too much product</option><option>Too expensive</option><option>Didn’t like the taste</option><option>Just taking a break</option><option>Something else</option></select></div>
               <p class="small muted">Just need a break? You can <button class="u" type="button" data-alt="skip">skip a delivery</button> or <button class="u" type="button" data-alt="pause">pause</button> instead.</p>`,
        foot: no('Keep subscription') + yes('Cancel subscription', 'abtn abtn--solid-danger'),
      });
      $$('[data-alt]', box).forEach(b => b.addEventListener('click', () => flows[b.dataset.alt]()));
      onOk(() => { saveSub({ status: 'cancelled' }); closeModal(); toast('Subscription cancelled'); });
    },
    rewards() {
      modal({
        title: 'Rewards', sub: 'The rewards catalogue is being finalised. Here’s the shape of it.',
        body: `<ul class="earn-list">
          <li><span class="ic ic--star">${ico('i-gift')}</span><p>Reward <span class="ph">[name TBC]</span><span class="small">Example reward</span></p><span class="val">20,000 Stars</span></li>
          <li><span class="ic ic--star">${ico('i-gift')}</span><p>Reward <span class="ph">[name TBC]</span><span class="small">Example reward</span></p><span class="val">XX,XXX Stars</span></li>
          <li><span class="ic ic--star">${ico('i-gift')}</span><p>Reward <span class="ph">[name TBC]</span><span class="small">Example reward</span></p><span class="val">XX,XXX Stars</span></li>
        </ul><p class="small muted">You’re 1,550 Stars from your next reward.</p>`,
        foot: no('Close'),
      });
    },
    payMethod() {
      modal({
        title: 'Payout method', sub: 'Where should we send your earnings?',
        body: choice('pm', [{ v: 'Bank account', t: 'Bank account' }, { v: 'PayPal', t: 'PayPal' }], get('mau.payout', 'Bank account')) +
          `<div class="callout">${ico('i-lock')}<span>You’ll connect your account on our payout partner’s secure page. <span class="ph">[Partner &amp; regions TBC]</span></span></div>`,
        foot: no() + yes('Continue'),
      });
      onOk(() => { put('mau.payout', picked('pm')); put('mau.payoutSet', true); closeModal(); paintPayout(); toast(`${picked('pm') || 'Payout method'} selected`); });
    },
    payout() {
      if (!get('mau.payoutSet', false)) {
        modal({
          title: 'Add a payout method first', sub: 'We need to know where to send your $357.20.',
          body: `<div class="callout">${ico('i-wallet')}<span>Choose a bank account or PayPal. It only takes a minute.</span></div>`,
          foot: no('Not now') + yes('Set up payout method'),
        });
        onOk(() => flows.payMethod());
        return;
      }
      modal({
        title: 'Request a payout',
        body: `<div class="payout"><p class="k">Amount</p><p class="num payout__v">$357.20</p>
          <dl><div><dt>Send to</dt><dd>${esc(get('mau.payout', 'Bank account'))} <span class="ph">[placeholder]</span></dd></div>
          <div><dt>Processing time</dt><dd><span class="ph">X–X business days — TBC</span></dd></div></dl></div>
          <p class="small muted">Payouts follow the MAU Affiliate Terms <span class="ph">[to be published]</span>.</p>`,
        foot: no() + yes('Request $357.20'),
      });
      onOk(() => { put('mau.payoutReq', true); closeModal(); paintPayout(); toast('Payout requested'); });
    },
    password() {
      modal({
        title: 'Change password',
        body: `<form class="form" id="pwForm" novalidate style="grid-template-columns:1fr">
          <div class="field"><label for="pw0">Current password</label><input class="input" id="pw0" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="pw1">New password</label><input class="input" id="pw1" type="password" autocomplete="new-password" minlength="8" required><small>At least 8 characters.</small></div>
          <div class="field"><label for="pw2">Confirm new password</label><input class="input" id="pw2" type="password" autocomplete="new-password" minlength="8" required></div></form>`,
        foot: no() + yes('Update password'),
      });
      onOk(() => {
        const f = $('#pwForm', box), a = $('#pw1', box), b = $('#pw2', box);
        b.setCustomValidity(a.value && a.value !== b.value ? 'Passwords don’t match' : '');
        if (!f.checkValidity()) { f.reportValidity(); return; }
        closeModal(); toast('Password updated');
      });
    },
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (b && !b.disabled && flows[b.dataset.m]) flows[b.dataset.m]();
  });

  /* ---------- payouts ---------- */
  const paintPayout = () => {
    const req = get('mau.payoutReq', false);
    const st = $('[data-payout-status]');
    if (st) st.hidden = !req;
    if (!document.documentElement.classList.contains('demo-empty')) $$('[data-avail]').forEach(el => { el.textContent = req ? '$0.00' : '$357.20'; });
    const btn = $('[data-m="payout"]');
    if (btn) { btn.disabled = req; btn.style.opacity = req ? '.5' : ''; btn.lastChild.textContent = req ? 'Payout requested' : 'Request payout'; }
    const pm = $('[data-m="payMethod"]');
    if (pm && get('mau.payoutSet', false)) pm.textContent = `${get('mau.payout', 'Bank account')} · change`;
  };
  paintPayout();

  /* ---------- orders ---------- */
  const PACK = { name: 'MAU Daily Superfood Bear Gummies', sub: 'Fresh Berry · 1 pouch', img: 'assets/mau-pack.webp', bg: 'var(--coral)' };
  const TRAVEL = { name: 'Travel pack', sub: '7 daily sachets', img: 'assets/sachet.svg', bg: 'var(--forest-2)' };
  const ORDERS = [
    { id: 'MAU-1052', date: '2026-11-16', items: [TRAVEL], kind: 'One-time', status: 'Processing', stars: null, step: 1 },
    { id: 'MAU-1048', date: '2026-11-12', items: [PACK], kind: 'Subscription', status: 'Delivered', stars: 5000, step: 3 },
    { id: 'MAU-1037', date: '2026-10-14', items: [PACK], kind: 'Subscription', status: 'Delivered', stars: 5000, step: 3 },
    { id: 'MAU-1029', date: '2026-09-16', items: [PACK], kind: 'Subscription', status: 'Delivered', stars: 5000, step: 3 },
    { id: 'MAU-1021', date: '2026-08-19', items: [PACK, TRAVEL], kind: 'One-time', status: 'Cancelled', stars: 0, step: 0 },
  ];
  const stPill = s => `<span class="pill ${s === 'Delivered' ? 'pill--ok' : s === 'Processing' ? 'pill--wait' : 'pill--off'}">${s}</span>`;
  const starsTxt = o => o.stars === null ? '<span class="muted">Pending</span>' : o.stars ? `${ico('i-star-f')}+${o.stars.toLocaleString('en-US')}` : '<span class="muted">—</span>';

  const rows = $('#orderRows');
  if (rows) {
    rows.innerHTML = ORDERS.map(o => `
      <tr data-order="${o.id}" tabindex="0" aria-label="Order ${o.id}, ${o.status}. Open details">
        <td class="o-id mono-cell"><b>${o.id}</b></td>
        <td class="o-date mono-cell muted">${short(o.date)}</td>
        <td class="o-prod">${o.items.map(i => i.name === PACK.name ? 'Daily Superfood Gummies' : i.name).join(' + ')} <span class="muted small">· ${o.kind}</span></td>
        <td class="o-st">${stPill(o.status)}</td>
        <td class="r o-tot">$XX</td>
        <td class="r stars-cell o-stars">${starsTxt(o)}</td>
        <td class="r o-open"><span class="open">${ico('i-chev-r')}</span></td>
      </tr>`).join('');
    const openRow = tr => openOrder(ORDERS.find(o => o.id === tr.dataset.order));
    rows.addEventListener('click', e => { const tr = e.target.closest('tr[data-order]'); tr && openRow(tr); });
    rows.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-order]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRow(tr); } });
  }

  const openOrder = o => {
    const cancelled = o.status === 'Cancelled';
    const steps = ['Ordered', 'Shipped', 'Delivered'];
    modal({
      title: `Order ${o.id}`,
      sub: `${full(o.date)} · ${o.kind}`,
      body: `
        <div class="od__meta">${stPill(o.status)}${o.status === 'Delivered' ? `<span>Delivered ${short(addDays(o.date, 4))}</span>` : o.status === 'Processing' ? '<span>Ships in 1–2 business days</span>' : ''}</div>
        ${cancelled ? `<div class="callout callout--warn">${ico('i-close')}<span>This order was cancelled, so you weren’t charged.</span></div>`
          : `<ol class="track" aria-label="Shipping status">${steps.map((s, i) => `<li class="${i < o.step ? 'on' : 'off'}">${s}</li>`).join('')}</ol>`}
        <ul class="od__items">${o.items.map(i => `<li><span class="thumb-sm" style="background:${i.bg}"><img src="${R}${i.img}" alt=""></span><p><b>${i.name}</b><br><span class="small muted">${i.sub}</span></p><span>$XX</span></li>`).join('')}</ul>
        <div class="od__rows">
          <div><span>Subtotal</span><span>$XX</span></div>
          <div><span>Shipping</span><span>${o.kind === 'Subscription' ? 'Free' : '$X.XX'}</span></div>
          ${o.kind === 'Subscription' ? '<div><span>Subscribe &amp; Save</span><span>−$XX</span></div>' : ''}
          <div><span>Tax</span><span>$X.XX</span></div>
          <div class="tot"><span>Total</span><span>$XX</span></div>
        </div>
        <div class="od__grid">
          <div><p class="k">Shipping address</p><p>${esc(addrLine(sub.addr))}</p></div>
          <div><p class="k">Payment</p><p>${esc(sub.pay)}</p></div>
        </div>
        ${o.stars ? `<p class="od__stars">${ico('i-star-f')}<span>This order earned <b>${o.stars.toLocaleString('en-US')} MAU Stars</b></span></p>`
          : o.stars === null ? `<p class="od__stars">${ico('i-star-f')}<span>Stars are added once your order is confirmed</span></p>` : ''}`,
      foot: `<a class="abtn" href="${R}index.html#faq">${ico('i-help')}Get help</a>
             ${cancelled ? '' : `<button class="abtn" type="button" data-track>${ico('i-truck')}Track order</button>`}
             <a class="btn btn--lime" href="${R}product.html">${ico('i-repeat')}Buy again</a>`,
    });
    const tr = $('[data-track]', box);
    tr && tr.addEventListener('click', () => toast('Carrier tracking opens here at launch'));
  };

  /* ---------- circle members ---------- */
  const MEMBERS = [
    ['Emma R.', '2026-11-15', 1], ['James T.', '2026-11-09', 1], ['Sarah P.', '2026-10-30', 0], ['Leo D.', '2026-10-06', 1],
    ['Maya K.', '2026-09-28', 1], ['Priya S.', '2026-09-21', 1], ['Noah B.', '2026-09-12', 1], ['Chloe W.', '2026-08-30', 0],
    ['Sam O.', '2026-08-22', 1], ['Ava L.', '2026-08-14', 1], ['Ben H.', '2026-08-03', 1], ['Zoe F.', '2026-07-26', 1],
    ['Omar A.', '2026-07-19', 0], ['Lily C.', '2026-07-08', 1], ['Max G.', '2026-06-30', 1], ['Ruby N.', '2026-06-21', 1],
    ['Theo V.', '2026-06-10', 0], ['Isla J.', '2026-06-02', 1],
  ];
  const tints = ['var(--lime)', 'var(--pistachio)', '#FBD9CE', 'var(--surface-2)'];
  const mList = $('#members');
  if (mList) {
    mList.innerHTML = MEMBERS.map(([n, d, a], i) => {
      const ini = n.split(' ').map(p => p[0]).join('');
      return `<li ${i >= 8 ? 'hidden' : ''}><span class="avatar" style="--c:${tints[i % 4]}" aria-hidden="true">${ini}</span>
        <p>${n}<time datetime="${d}">Joined ${short(d)}</time></p>
        <span class="pill ${a ? 'pill--ok' : 'pill--off'}">${a ? 'Active' : 'Inactive'}</span></li>`;
    }).join('');
    const more = $('#moreMembers');
    more.addEventListener('click', () => {
      const showAll = more.dataset.all !== '1';
      $$('li', mList).forEach((li, i) => { li.hidden = !showAll && i >= 8; });
      more.dataset.all = showAll ? '1' : '';
      more.textContent = showAll ? 'Show fewer' : `Show all ${MEMBERS.length}`;
    });
  }

  /* ---------- stars filter ---------- */
  $$('.tabs [data-filter]').forEach(t => t.addEventListener('click', () => {
    $$('.tabs [data-filter]').forEach(o => o.setAttribute('aria-selected', String(o === t)));
    $$('#ledger li').forEach(li => { li.hidden = t.dataset.filter !== 'all' && li.dataset.t !== t.dataset.filter; });
  }));

  /* ---------- profile forms + toggles ---------- */
  $$('form[data-save]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const h = $('#handle', f);
    if (h) { put('mau.handle', h.value.trim().toLowerCase()); paintRef(); }
    const s = $('.saved', f);
    s.textContent = 'Saved ✓';
    setTimeout(() => { s.textContent = ''; }, 2400);
    toast('Changes saved');
  }));
  const handleIn = $('#handle');
  if (handleIn) handleIn.value = handle();
  $$('[data-toggle]').forEach(t => t.addEventListener('change', () => toast(`${t.dataset.toggle} ${t.checked ? 'on' : 'off'}`)));

  /* ---------- empty-state preview flag ---------- */
  if (document.documentElement.classList.contains('demo-empty')) {
    $$('[data-zero]').forEach(el => { el.textContent = el.dataset.zero; });
    const a = Object.assign(document.createElement('a'), { className: 'state-flag', href: '?state=full', textContent: 'Empty-state preview · show data' });
    document.body.appendChild(a);
  }
})();
