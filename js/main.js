/* MAU — landing page interactions */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav state ---------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- mobile menu ---------- */
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  const reveals = $$('.reveal');
  // stagger siblings
  reveals.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 70}ms`);
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---------- parallax ---------- */
  const px = $$('[data-speed]');
  if (!reduce && px.length) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      const mobile = window.innerWidth < 720;
      px.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const center = r.top + r.height / 2 - vh / 2;
        const speed = parseFloat(el.dataset.speed) * (mobile ? 0.5 : 1);
        el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();
  }

  /* ---------- MAU Stars counter + member dots ---------- */
  const dots = $('.dots');
  if (dots) {
    const total = +dots.dataset.total, filled = +dots.dataset.filled;
    dots.innerHTML = Array.from({ length: total }, () => '<i></i>').join('');
  }
  const num = $('.starcard__num');
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const runStars = () => {
    const target = +num.dataset.count;
    const dotEls = dots ? $$('i', dots) : [];
    const filled = dots ? +dots.dataset.filled : 0;
    if (reduce) {
      num.textContent = fmt(target);
      dotEls.slice(0, filled).forEach(d => d.classList.add('on'));
      return;
    }
    const dur = 1800, t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const tick = now => {
      const t = Math.min(1, (now - t0) / dur);
      num.textContent = fmt(target * ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    dotEls.slice(0, filled).forEach((d, i) => setTimeout(() => d.classList.add('on'), 300 + i * 55));
  };
  if (num) {
    if ('IntersectionObserver' in window) {
      if (!reduce) num.textContent = '0';
      const sio = new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { runStars(); sio.disconnect(); }
      }, { threshold: 0.35 });
      sio.observe($('#starcard'));
    } else runStars();
  }

  /* ---------- purchase plans ---------- */
  const plans = $$('.plan');
  const cta = $('#buyCta span');
  plans.forEach(p => {
    const input = $('input', p);
    input.addEventListener('change', () => {
      plans.forEach(o => o.classList.toggle('is-selected', o === p));
      const sub = input.value === 'sub';
      cta.textContent = sub ? 'Start my mau' : 'Buy once';
    });
  });

  /* ---------- product gallery ---------- */
  const panel = $('#buyPanel');
  const thumbs = $$('.thumb');
  thumbs.forEach(t => t.addEventListener('click', () => {
    panel.dataset.view = t.dataset.view;
    thumbs.forEach(o => {
      const on = o === t;
      o.classList.toggle('is-active', on);
      o.setAttribute('aria-selected', String(on));
    });
  }));

  /* ---------- FAQ accordion ---------- */
  $$('.acc__item').forEach(item => {
    const btn = $('button', item);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
    });
  });

  /* ---------- UGC feed scroll buttons ---------- */
  const feed = $('#feed');
  $$('.ugc__btns .round-btn').forEach(b => b.addEventListener('click', () => {
    const tile = $('.tile', feed);
    const step = (tile ? tile.getBoundingClientRect().width + 18 : 300) * 2;
    feed.scrollBy({ left: step * +b.dataset.dir, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- sticky mobile CTA ---------- */
  const bar = $('#stickybar');
  if (bar && 'IntersectionObserver' in window) {
    const hidden = new Set();
    const watch = [$('.hero'), $('#shop'), $('.final'), $('.footer')];
    const sio = new IntersectionObserver(entries => {
      entries.forEach(en => en.isIntersecting ? hidden.add(en.target) : hidden.delete(en.target));
      const on = hidden.size === 0;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      $('a', bar).tabIndex = on ? 0 : -1;
    }, { threshold: 0 });
    watch.forEach(el => el && sio.observe(el));
  }

  /* ---------- newsletter (front-end only) ---------- */
  const news = $('#news');
  news.addEventListener('submit', e => {
    e.preventDefault();
    if (!news.checkValidity()) return;
    news.hidden = true;
    $('#newsOk').hidden = false;
  });
})();
