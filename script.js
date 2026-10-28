/**
 * AARMBH MEDIA — interactions, transitions & scroll animation (style E)
 * Deps (CDN, all optional — the page still works without them): GSAP + ScrollTrigger, Lenis
 */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduced;
  const WA = 'https://wa.me/919999999999?text=';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------------------------------------------------------------------------
  // Smooth scroll; scroll velocity shared by the marquees and the badge
  // ---------------------------------------------------------------------------
  let lenis = null, velocity = 0;
  if (window.Lenis && motion) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', e => { ScrollTrigger.update(); velocity = e.velocity || 0; });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // until the preloader finishes
  }
  const lockScroll = on => (lenis ? (on ? lenis.stop() : lenis.start()) : (document.body.style.overflow = on ? 'hidden' : ''));
  const jump = (hash, smooth) => {
    const el = hash === '#top' ? 0 : $(hash);
    if (el == null) return;
    if (lenis) return lenis.scrollTo(el, { offset: el === 0 ? 0 : -60, immediate: !smooth, duration: 1.2 });
    el === 0 ? scrollTo({ top: 0 }) : el.scrollIntoView();
  };

  // nav links cover the screen with an accent wipe, jump, then uncover
  const wipe = $('#wipe');
  let wiping = false;
  const goTo = hash => {
    if (!motion) return jump(hash, true);
    if (wiping) return;
    wiping = true;
    gsap.timeline({ onComplete: () => (wiping = false) })
      .fromTo(wipe, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .55, ease: 'power3.inOut' })
      .fromTo('.wipe-word', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .45, ease: 'expo.out' }, '-=.2')
      .add(() => { jump(hash); ScrollTrigger.update(); })
      .to(wipe, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'power3.inOut' }, '+=.12')
      .set(wipe, { clipPath: 'inset(100% 0 0 0)' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const h = a.getAttribute('href');
    if (h.length < 2) return;
    e.preventDefault();
    const fromMenu = menu.classList.contains('open');
    closeMenu();
    fromMenu || !a.closest('.nav, .footer, .menu') ? jump(h, true) : goTo(h);
  }));

  // keep --edge equal to the real content edge of .wrap (100vw would include the scrollbar)
  const setEdge = () => { const w = $('.wrap'); if (!w) return; root.style.setProperty("--edge", w.getBoundingClientRect().left + parseFloat(getComputedStyle(w).paddingLeft) + "px"); };
  setEdge(); addEventListener("resize", setEdge);
  // the scrollbar appears after the preloader, which narrows the page: measure again
  if (window.ResizeObserver) new ResizeObserver(setEdge).observe(document.body);

  // ---------------------------------------------------------------------------
  // Day / dark theme: a wave of the new page colour spreads from the switch,
  // the theme swaps under it, then the wave dissolves
  // ---------------------------------------------------------------------------
  const THEME_BG = { dark: '#0c0c0d', day: '#f5f3ee' };
  const wave = $('#wave');
  const applyTheme = t => {
    root.dataset.theme = t;
    store.set('aarmbh-theme', t);
    $('meta[name="theme-color"]').setAttribute('content', THEME_BG[t]);
  };
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
    const t = root.dataset.theme === 'day' ? 'dark' : 'day';
    if (!motion) return applyTheme(t);
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const scale = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 10 + 2;
    gsap.timeline()
      .set(wave, { left: x, top: y, background: THEME_BG[t], scale: 0, opacity: 1 })
      .to(wave, { scale, duration: .7, ease: 'power3.inOut' })
      .add(() => applyTheme(t))
      .to(wave, { opacity: 0, duration: .6, ease: 'power2.out' })
      .from('.hero-title .line > span, .rv-line.in .line > span', { yPercent: 30, opacity: 0, duration: .7, stagger: .02, ease: 'expo.out', clearProps: 'transform,opacity' }, '<');
  }));
  applyTheme(root.dataset.theme || 'dark');

  // nav and footer labels roll up to an accent copy on hover
  $$('.nav-links a, .f-col a').forEach(a => {
    const t = a.textContent.trim();
    a.innerHTML = `<span class="roll"><b data-t="${t}">${t}</b></span>`;
  });

  // ---------------------------------------------------------------------------
  // Cursor (small dot, ring over clickables) + magnetic buttons
  // ---------------------------------------------------------------------------
  if (finePointer && !reduced) {
    const cur = $('#cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function loop() {
      cx += (x - cx) * .22; cy += (y - cy) * .22;
      cur.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => cur.classList.toggle('is-link', !!e.target.closest('a, button, label, .shot, .rcard, input[type=range]')));
    $$('.btn, .reel-play, .badge').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${(e.clientX - r.left - r.width / 2) * .2}px ${(e.clientY - r.top - r.height / 2) * .3}px`;
      });
      el.addEventListener('pointerleave', () => (el.style.translate = ''));
    });
  }

  // ---------------------------------------------------------------------------
  // Nav: solid after the top, hides on scroll-down, highlights the section
  // ---------------------------------------------------------------------------
  const nav = $('#nav'), menu = $('#menu'), menuBtn = $('#menuBtn');
  const toTop = $('#toTop');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 30);
    nav.classList.toggle('hidden', y > lastY && y > innerHeight && !menu.classList.contains('open'));
    toTop.classList.toggle('show', y > innerHeight * 1.2);
    lastY = y;
  }, { passive: true });
  const navLinks = $$('.nav-links a');
  const io = new IntersectionObserver(es => es.forEach(en => {
    const link = navLinks.find(a => a.getAttribute('href') === '#' + en.target.id);
    if (link) link.classList.toggle('is-on', en.isIntersecting);
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); s && io.observe(s); });

  function closeMenu() {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open'); menuBtn.classList.remove('open'); nav.classList.remove('menu-on');
    menuBtn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }
  menuBtn.addEventListener('click', () => {
    if (menu.classList.contains('open')) return closeMenu();
    menu.classList.add('open'); menuBtn.classList.add('open'); nav.classList.add('menu-on');
    menuBtn.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  });

  // ---------------------------------------------------------------------------
  // Hero slideshow (crossfade + slow drift, progress segments)
  // ---------------------------------------------------------------------------
  const slides = $$('#heroMedia img'), segs = $$('#segs button');
  let active = 0, cycle;
  const setSlide = i => {
    active = (i + slides.length) % slides.length;
    slides.forEach((im, k) => { if (k === active) { im.classList.remove('is-on'); void im.offsetWidth; } im.classList.toggle('is-on', k === active); });
    segs.forEach((s, k) => { s.classList.remove('is-on'); void s.offsetWidth; s.classList.toggle('is-on', k === active); s.classList.toggle('done', k < active); });
    clearTimeout(cycle);
    if (!reduced) cycle = setTimeout(() => setSlide(active + 1), 5500);
  };
  segs.forEach((s, i) => s.addEventListener('click', () => setSlide(i)));

  // headline split into characters (gradient/em spans keep their colour)
  const titleChars = [];
  $$('.hero-title .line > span').forEach(line => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach(ch => {
          if (ch === ' ') return frag.append(' ');
          const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; frag.append(s); titleChars.push(s);
        });
        n.replaceWith(frag);
      } else walk(n);
    });
    walk(line);
  });

  // ---------------------------------------------------------------------------
  // Count-up numbers
  // ---------------------------------------------------------------------------
  const countUp = el => {
    const end = +el.dataset.count;
    if (!motion) { el.textContent = end; return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
  };

  // ---------------------------------------------------------------------------
  // Preloader → hero intro
  // ---------------------------------------------------------------------------
  const preloader = $('#preloader');
  const intro = () => {
    document.body.classList.remove('is-loading');
    lockScroll(false);
    setEdge();
    setSlide(0);
    if (!motion) { preloader.remove(); return; }
    gsap.timeline()
      .to('.pre-word, .pre-bar, .pre-count', { yPercent: -40, opacity: 0, duration: .45, ease: 'power2.in' })
      .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, '-=.1')
      .add(() => preloader.remove())
      .from('#heroMedia', { scale: 1.25, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, '-=.6')
      .from(titleChars, { yPercent: 120, rotate: 8, duration: 1, stagger: .025, ease: 'expo.out' }, '<.15')
      .from('.hero .kicker, .hero-side > *, .hero-foot', { y: 24, opacity: 0, stagger: .08, duration: .9, ease: 'expo.out', clearProps: 'transform,opacity' }, '<.3')
      .from('.badge', { scale: 0, rotate: -120, duration: 1.2, ease: 'back.out(1.6)', clearProps: 'scale' }, '<.1')
      .from('#nav', { yPercent: -100, duration: .9, ease: 'expo.out', clearProps: 'transform' }, '<')
      .add(() => $$('.stats [data-count]').forEach(countUp), '<');
  };
  if (motion) {
    preloader.style.clipPath = 'inset(0 0 0% 0)';
    const c = { v: 0 };
    let loaded = document.readyState === 'complete';
    addEventListener('load', () => (loaded = true));
    setTimeout(() => (loaded = true), 2500); // never hold the page hostage
    gsap.from('.pre-word', { yPercent: 60, opacity: 0, duration: .8, ease: 'expo.out' });
    gsap.to(c, {
      v: 100, duration: 1.2, ease: 'power2.inOut',
      onUpdate() {
        const v = loaded ? c.v : Math.min(c.v, 90);
        $('#preCount').textContent = Math.round(v);
        $('#preBar').style.width = v + '%';
      },
      onComplete() { const wait = () => (loaded ? intro() : setTimeout(wait, 100)); wait(); }
    });
  } else intro();

  // ---------------------------------------------------------------------------
  // Work: filters + lightbox
  // ---------------------------------------------------------------------------
  const shots = $$('.shot');
  $$('#filters .filter').forEach(b => b.addEventListener('click', () => {
    $$('#filters .filter').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.filter;
    shots.forEach(s => s.classList.toggle('is-out', f !== 'all' && s.dataset.tags !== f));
    if (motion) gsap.fromTo(shots.filter(s => !s.classList.contains('is-out')), { y: 30, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, stagger: .06, duration: .7, ease: 'expo.out' });
    hasGsap && ScrollTrigger.refresh();
  }));
  (() => {
    const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
    const visible = () => shots.filter(s => !s.classList.contains('is-out'));
    let cur = 0;
    const show = i => {
      const items = visible();
      cur = (i + items.length) % items.length;
      img.src = items[cur].dataset.full;
      img.alt = items[cur].dataset.caption;
      cap.textContent = items[cur].dataset.caption;
    };
    const open = s => { show(visible().indexOf(s)); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); lockScroll(true); $('#lbClose').focus(); };
    const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lockScroll(false); };
    shots.forEach(s => {
      s.tabIndex = 0;
      s.setAttribute('role', 'button');
      s.setAttribute('aria-label', `View ${s.dataset.caption}`);
      s.addEventListener('click', () => open(s));
      s.addEventListener('keydown', e => e.key === 'Enter' && open(s));
    });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => show(cur - 1));
    $('#lbNext').addEventListener('click', () => show(cur + 1));
    lb.addEventListener('click', e => e.target === lb && close());
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  })();

  // ---------------------------------------------------------------------------
  // Full-screen reel player (hero button, showreel button, any reel card)
  // ---------------------------------------------------------------------------
  const modal = $('#reelModal'), modalVideo = $('#reelModalVideo');
  const openReel = (start = 0) => {
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); lockScroll(true);
    clearTimeout(cycle);
    const play = () => { modalVideo.currentTime = start; modalVideo.muted = false; modalVideo.play().catch(() => {}); };
    modalVideo.readyState ? play() : (modalVideo.preload = 'auto', modalVideo.addEventListener('loadedmetadata', play, { once: true }), modalVideo.load());
    $('#reelClose').focus();
  };
  const closeReel = () => {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); lockScroll(false);
    modalVideo.pause();
    setSlide(active + 1);
  };
  $('#playReel').addEventListener('click', () => openReel(0));
  $('#playReel2').addEventListener('click', () => openReel(0));
  $('#reelClose').addEventListener('click', closeReel);
  modal.addEventListener('click', e => e.target === modal && closeReel());
  addEventListener('keydown', e => e.key === 'Escape' && modal.classList.contains('open') && closeReel());

  // ---------------------------------------------------------------------------
  // Reels: vertical cards loop a 4-second clip on hover (desktop) or in view (touch)
  // ---------------------------------------------------------------------------
  (() => {
    const track = $('#reelsTrack'), cards = $$('.rcard', track);
    const CLIP = 4;
    cards.forEach(card => {
      const v = $('video', card), start = +card.dataset.start;
      const bar = document.createElement('i'); bar.className = 'rbar'; card.append(bar);
      v.addEventListener('loadedmetadata', () => (v.currentTime = start), { once: true });
      v.addEventListener('timeupdate', () => {
        if (v.currentTime > start + CLIP || v.currentTime < start - .2) v.currentTime = start;
        bar.style.transform = `scaleX(${clamp((v.currentTime - start) / CLIP, 0, 1)})`;
      });
      card.play = () => { card.classList.add('playing'); v.play().catch(() => {}); };
      card.stop = () => { card.classList.remove('playing'); v.pause(); };
      if (finePointer) { card.addEventListener('pointerenter', card.play); card.addEventListener('pointerleave', card.stop); }
      card.addEventListener('click', () => { if (!dragged) openReel(start); });
    });
    if (!finePointer) {
      const vio = new IntersectionObserver(es => es.forEach(en => (en.isIntersecting ? en.target.play() : en.target.stop())), { root: track, threshold: .7 });
      cards.forEach(c => vio.observe(c));
    }
    const step = () => cards[0].offsetWidth * 2 + 32;
    $('#reelsPrev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('#reelsNext').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

    // drag to scroll with the mouse
    let down = false, startX = 0, startLeft = 0, dragged = false;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; dragged = false; startX = e.clientX; startLeft = track.scrollLeft; track.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - startX; if (Math.abs(dx) > 5) dragged = true; track.scrollLeft = startLeft - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; track.style.scrollSnapType = ''; });
  })();

  // ---------------------------------------------------------------------------
  // Showreel background loop plays only while visible
  // ---------------------------------------------------------------------------
  const reelBg = $('#reelBg');
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { reelBg.preload = 'auto'; reelBg.play().catch(() => {}); } else reelBg.pause();
  }, { rootMargin: '200px 0px' }).observe(reelBg);

  // ---------------------------------------------------------------------------
  // Testimonials slider
  // ---------------------------------------------------------------------------
  (() => {
    const voices = $$('.voice'), idx = $('#voiceIdx'), bar = $('#voiceBar');
    let cur = 0, timer, barTween;
    const go = i => {
      const prev = voices[cur];
      cur = (i + voices.length) % voices.length;
      const next = voices[cur];
      idx.textContent = String(cur + 1).padStart(2, '0');
      if (motion && prev !== next) {
        gsap.to(prev, { opacity: 0, y: -24, filter: 'blur(6px)', duration: .45, ease: 'power2.in', onComplete: () => { prev.classList.remove('is-on'); gsap.set(prev, { clearProps: 'all' }); } });
        next.classList.add('is-on');
        gsap.fromTo(next, { opacity: 0, y: 34, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, delay: .35, ease: 'expo.out' });
      } else voices.forEach(v => v.classList.toggle('is-on', v === next));
      restart();
    };
    const restart = () => {
      clearTimeout(timer);
      if (reduced) return;
      timer = setTimeout(() => go(cur + 1), 6000);
      if (hasGsap) { barTween && barTween.kill(); barTween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 6, ease: 'none' }); }
    };
    $('#voicePrev').addEventListener('click', () => go(cur - 1));
    $('#voiceNext').addEventListener('click', () => go(cur + 1));
    restart();
  })();

  // ---------------------------------------------------------------------------
  // Enquiry form (inline validation, WhatsApp hand-off)
  // ---------------------------------------------------------------------------
  (() => {
    const form = $('#briefForm'), err = $('#fError');
    form.addEventListener('input', e => e.target.classList.remove('invalid'));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const req = $$('[required]', form);
      const bad = req.filter(f => !f.value.trim());
      req.forEach(f => f.classList.toggle('invalid', bad.includes(f)));
      err.textContent = bad.length ? 'Please fill the highlighted fields.' : '';
      if (bad.length) return bad[0].focus();
      const v = id => $(id).value.trim();
      const text = `*NEW EVENT ENQUIRY — AARMBH*\n\n• Name: ${v('#bName')}\n• WhatsApp: ${v('#bPhone')}\n• Event: ${v('#bType')}\n• Date: ${v('#bDate') || 'TBD'}\n• Notes: ${v('#bNote') || '—'}`;
      $('#fSuccessWa').href = WA + encodeURIComponent(text);
      $$('.f, button[type=submit]', form).forEach(el => (el.hidden = true));
      $('#fSuccess').hidden = false;
      if (motion) gsap.from('#fSuccess', { y: 20, opacity: 0, duration: .8, ease: 'expo.out' });
    });
  })();

  // ---------------------------------------------------------------------------
  // Footer wordmark: reveal, then letters fill as the pointer passes
  // ---------------------------------------------------------------------------
  const giant = $('#footerGiant');
  giant.innerHTML = [...giant.textContent].map(c => `<span class="char">${c}</span>`).join('');
  const gChars = $$('.char', giant);
  giant.addEventListener('pointermove', e => gChars.forEach(c => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--f', clamp(1.25 - Math.abs(e.clientX - (r.left + r.width / 2)) / r.width * .55, 0, 1).toFixed(3));
  }));
  giant.addEventListener('pointerleave', () => gChars.forEach(c => c.style.setProperty('--f', 0)));
  // observe the footer itself: a fully clipped element never reports as intersecting
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { giant.classList.add('in'); o.disconnect(); } }, { threshold: .05 }).observe($('.footer'));

  // ---------------------------------------------------------------------------
  // Reveal on enter. Content is visible by default; with JS on, items rise and
  // fade in through CSS transitions when they enter the viewport. A safety net
  // reveals anything already on screen, so text can never stay hidden.
  // ---------------------------------------------------------------------------
  const REVEAL_GROUPS = [
    '.head .label, .head-note, .filters, .reels-nav',
    '.card', '.inhouse li', '.cities .label, .cities li',
    '.why-left .label', '.why-list li',
    '.rcard', '.reel-copy .reel-play, .reel-copy .label',
    '.voice-wrap > .label, .voice-stage, .voice-nav',
    '.contact-copy .label, .lead, .channels li', '.f, .brief .btn',
    '.f-brand, .f-col'
  ];
  REVEAL_GROUPS.forEach(sel => $$(sel).forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', i % 8); }));
  $$('section:not(.hero) .display.h2').forEach(h => { h.classList.add('rv-line'); $$('.line', h).forEach((l, i) => l.style.setProperty('--l', i)); });
  $$('.shot, .why-img').forEach((el, i) => { el.classList.add('rv-clip'); el.style.setProperty('--d', i % 6); });
  $$('.scard').forEach(card => $$('.scard-top, h3, .scard-text > p, .scard-points', card).forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', i); }));

  const revealables = $$('.rv, .rv-line, .rv-clip');
  const showAll = () => revealables.forEach(el => el.classList.add('in'));
  if (reduced || !('IntersectionObserver' in window)) showAll();
  else {
    const rio = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(el => rio.observe(el));
    // safety net: anything above the fold of the current scroll position is shown
    const sweep = () => revealables.forEach(el => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); });
    addEventListener('load', () => setTimeout(sweep, 1200));
    let sweepT;
    addEventListener('scroll', () => { clearTimeout(sweepT); sweepT = setTimeout(sweep, 400); }, { passive: true });
    // and on a slow timer, which needs no scroll events at all; stops once everything is in
    const sweepLoop = setInterval(() => { sweep(); if (revealables.every(el => el.classList.contains('in'))) clearInterval(sweepLoop); }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Scroll-linked motion (GSAP only). Nothing here hides text.
  // ---------------------------------------------------------------------------
  if (!motion) return;

  // spinning badge + crossing marquees, both pushed by scroll speed
  const badgeSvg = $('.badge svg');
  const bandA = $('.band-a .band-track'), bandB = $('.band-b .band-track');
  [bandA, bandB].forEach(t => (t.innerHTML += t.innerHTML));
  const loopA = gsap.to(bandA, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
  const loopB = gsap.fromTo(bandB, { xPercent: -50 }, { xPercent: 0, duration: 34, ease: 'none', repeat: -1 });
  let spin = 0, boost = 0, dir = 1;
  gsap.ticker.add(() => {
    boost += (Math.min(Math.abs(velocity) / 6, 5) - boost) * .08;
    if (Math.abs(velocity) > 1) dir = velocity > 0 ? 1 : -1;
    loopA.timeScale((1 + boost) * dir);
    loopB.timeScale((1 + boost) * dir);
    spin += (.3 + boost * 1.2) * dir;
    badgeSvg.style.transform = `rotate(${spin}deg)`;
  });

  // hero leaves: the photo settles into a rounded frame, the headline lines part
  // left and right, the rest lifts away
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } })
    .fromTo('#heroMedia', { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(5% 3% 8% 3% round 5px)', ease: 'none' }, 0)
    .to('.hero-title .line:nth-child(1)', { xPercent: -30, ease: 'none' }, 0)
    .to('.hero-title .line:nth-child(2)', { xPercent: 30, ease: 'none' }, 0)
    .to('.hero-copy, .hero-foot', { opacity: 0, ease: 'power1.in' }, 0)
    .to('.badge', { yPercent: -60, rotate: 90, opacity: 0, ease: 'none' }, 0);

  // giant outline words drift sideways behind their sections
  $$('.bgword').forEach(w => gsap.fromTo(w, { xPercent: 6 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: w.parentElement, start: 'top bottom', end: 'bottom top', scrub: .8 } }));

  // light sections open like sheets: a framed panel widening to full width
  $$('#services, #why').forEach(sec => gsap.fromTo(sec,
    { clipPath: 'inset(0% 3% 0% 3% round 5px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 30%', scrub: .6 } }));

  // photos drift gently inside their frames
  $$('.card-img img').forEach(img => gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.shot img').forEach(img => gsap.fromTo(img, { scale: 1.18 }, { scale: 1.03, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom center', scrub: true } }));
  gsap.fromTo('.why-img img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.why-img', start: 'top bottom', end: 'bottom top', scrub: true } });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    // work tiles move at slightly different speeds, so the grid shifts in layers
    $$('.shot').forEach((s, i) => gsap.to(s, { y: [-20, 30, -36, 24, -24, 36][i % 6], ease: 'none', scrollTrigger: { trigger: '.work-grid', start: 'top bottom', end: 'bottom top', scrub: 1 } }));

    // the reels row glides sideways while you scroll down
    gsap.fromTo('#reelsTrack', { x: 0 }, { x: -200, ease: 'none', scrollTrigger: { trigger: '.reels', start: 'top 60%', end: 'bottom top', scrub: 1 } });

    // showreel: pinned; the window grows to full screen and the title closes up
    gsap.timeline({ scrollTrigger: { trigger: '.reel', start: 'top top', end: '+=110%', pin: '.reel-pin', scrub: .7 } })
      .fromTo('#reelFrame', { clipPath: 'inset(22% 26% 22% 26% round 5px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
      .fromTo('#reelBg', { scale: 1.6 }, { scale: 1.25, ease: 'none' }, 0)
      .fromTo('.rt-a', { xPercent: -36 }, { xPercent: 0, ease: 'none' }, 0)
      .fromTo('.rt-b', { xPercent: 36 }, { xPercent: 0, ease: 'none' }, 0);

    // process: each card sticks; as the next slides over it, it sinks back and dims
    const scards = $$('.scard');
    scards.forEach((card, i) => {
      const next = scards[i + 1];
      if (next) gsap.to(card, { scale: .94, '--dim': .5, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: .6 } });
      gsap.fromTo($('.scard-img img', card), { scale: 1.2 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 20%', scrub: .6 } });
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
