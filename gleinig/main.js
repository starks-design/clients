/* ============================================================
   Schreinerei Gleinig — One-Pager
   GSAP + ScrollTrigger + Lenis + WebGL Holzmaserung
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = window.matchMedia('(min-width: 900px)').matches;

/* ------------------------------------------------------------
   Lenis Smooth Scroll
   ------------------------------------------------------------ */
let lenis = null;
if (!prefersReduced) {
  lenis = new Lenis({ lerp: 0.105, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (a.dataset.project) return; // Portfolio-Items öffnen die Lightbox
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      closeMenu();
      scrollToTarget(id);
    }
  });
});

/* ------------------------------------------------------------
   Text-Splitting Helpers
   ------------------------------------------------------------ */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);
  [...text].forEach((ch) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ch === ' ' ? '&nbsp;' : ch;
    el.appendChild(s);
  });
  return el.querySelectorAll('.char');
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words
    .map((w) => `<span class="word" aria-hidden="true">${w}</span>`)
    .join(' ');
  return el.querySelectorAll('.word');
}

/* ------------------------------------------------------------
   WebGL Holzmaserung (Footer-Canvas)
   ------------------------------------------------------------ */
function initGrainCanvas() {
  const canvas = document.getElementById('grain-canvas');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) { canvas.style.display = 'none'; return; }

  const vert = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  // Fließende Maserungslinien — das Bildmarken-Motiv als lebende Fläche
  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.05 + vec2(13.7, 7.3);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p = uv;
      p.x *= uRes.x / uRes.y;

      vec2 m = (uMouse - 0.5) * 0.25;
      float t = uTime * 0.03;

      // Maserungsfeld: gestreckte fbm-Wellen, horizontal fließend
      float field = fbm(vec2(p.x * 1.6 + t + m.x, p.y * 5.5 + m.y));
      field += 0.35 * fbm(vec2(p.x * 3.2 - t * 0.7, p.y * 9.0));

      // Konturlinien aus dem Feld ziehen
      float lines = abs(fract(field * 7.0) - 0.5) * 2.0;
      float line = smoothstep(0.0, 0.16, lines);

      // Astloch-Verdichtung um die Maus
      float d = distance(uv, uMouse);
      float knot = smoothstep(0.35, 0.0, d) * 0.22;
      float lines2 = abs(fract((field + knot) * 12.0) - 0.5) * 2.0;
      float fine = smoothstep(0.0, 0.3, lines2);

      vec3 brown = vec3(0.227, 0.176, 0.157);      // #3a2d28
      vec3 brownLift = vec3(0.302, 0.235, 0.208);  // hellere Maserung
      vec3 sandHint = vec3(0.42, 0.37, 0.31);      // Sand-Anklang, gedimmt

      vec3 col = brown;
      col = mix(brownLift, col, line);
      col = mix(mix(sandHint, brown, 0.86), col, 0.55 + 0.45 * fine);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');

  const mouse = { x: 0.5, y: 0.45 };
  const eased = { x: 0.5, y: 0.45 };
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = 1.0 - (e.clientY - r.top) / r.height;
  }, { passive: true });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  let raf;
  const start = performance.now();
  function frame() {
    eased.x += (mouse.x - eased.x) * 0.04;
    eased.y += (mouse.y - eased.y) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.uniform2f(uMouse, eased.x, eased.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!prefersReduced) raf = requestAnimationFrame(frame);
  }
  frame();
  cancelAnimationFrame(raf); // ein Frame rendern, Loop erst bei sichtbarem Footer

  // Canvas pausieren wenn Footer nicht sichtbar
  ScrollTrigger.create({
    trigger: '.footer',
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { if (!prefersReduced) { cancelAnimationFrame(raf); frame(); } },
    onLeaveBack: () => cancelAnimationFrame(raf),
  });
}
initGrainCanvas();

/* ------------------------------------------------------------
   Holzstaub im Licht (Hero-Canvas, 2D)
   ------------------------------------------------------------ */
function initDust() {
  const canvas = document.getElementById('dust-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W, H, dpr;
  const N = window.matchMedia('(min-width: 900px)').matches ? 110 : 45;
  const parts = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(p, fresh) {
    p.x = Math.random() * W;
    p.y = fresh ? Math.random() * H : H + 8;
    p.r = 0.6 + Math.random() * 1.9;
    p.vx = -0.06 - Math.random() * 0.22;
    p.vy = -0.10 - Math.random() * 0.28;
    p.drift = Math.random() * Math.PI * 2;
    p.alpha = 0.12 + Math.random() * 0.4;
    p.warm = Math.random() > 0.5;
    return p;
  }
  for (let i = 0; i < N; i++) parts.push(spawn({}, true));

  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }, { passive: true });

  let raf;
  let t = 0;
  function frame() {
    t += 0.008;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx + Math.sin(t * 2 + p.drift) * 0.18;
      p.y += p.vy;
      // Sanftes Ausweichen um den Cursor
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 16000) {
        const f = (16000 - d2) / 16000;
        p.x += (dx / Math.sqrt(d2 + 1)) * f * 1.6;
        p.y += (dy / Math.sqrt(d2 + 1)) * f * 1.6;
      }
      if (p.y < -10 || p.x < -10) spawn(p, false);
      const tw = 0.75 + 0.25 * Math.sin(t * 3 + p.drift * 3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.warm
        ? `rgba(214, 196, 160, ${p.alpha * tw})`
        : `rgba(245, 243, 238, ${p.alpha * tw})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  if (prefersReduced) { frame(); cancelAnimationFrame(raf); return; }
  frame();

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top bottom',
    end: 'bottom top',
    onLeave: () => cancelAnimationFrame(raf),
    onEnterBack: () => { cancelAnimationFrame(raf); frame(); },
  });
}
initDust();

/* ------------------------------------------------------------
   Custom Cursor
   ------------------------------------------------------------ */
(function initCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cursor = document.getElementById('cursor');
  const label = cursor.querySelector('.cursor__label');
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });

  window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });

  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });
  document.querySelectorAll('[data-cursor-label]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      label.textContent = el.dataset.cursorLabel;
      cursor.classList.add('has-label');
    });
    el.addEventListener('pointerleave', () => cursor.classList.remove('has-label'));
  });
})();

/* ------------------------------------------------------------
   Preloader → Hero Intro
   ------------------------------------------------------------ */
const heroChars1 = splitChars(document.querySelectorAll('[data-split]')[0]);
const heroChars2 = splitChars(document.querySelectorAll('[data-split]')[1]);

function buildIntro(markShapes, typeShapes) {
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });

  if (markShapes && markShapes.length) {
    // Maserung: geometrisch von der Mitte nach außen staggern
    const svgEl = markShapes[0].ownerSVGElement;
    const vb = svgEl.viewBox.baseVal;
    const cx = vb.x + vb.width / 2;
    const cy = vb.y + vb.height / 4; // Bildmarke sitzt in der oberen Hälfte
    const sorted = [...markShapes].sort((a, b) => {
      const ba = a.getBBox(); const bb = b.getBBox();
      const da = Math.hypot(ba.x + ba.width / 2 - cx, ba.y + ba.height / 2 - cy);
      const db = Math.hypot(bb.x + bb.width / 2 - cx, bb.y + bb.height / 2 - cy);
      return da - db;
    });
    gsap.set(sorted, { autoAlpha: 0, scale: 0.86, y: 14, transformOrigin: '50% 50%' });
    intro.to(sorted, {
      autoAlpha: 1, scale: 1, y: 0,
      duration: 0.9, ease: 'power3.out',
      stagger: 0.085,
    });
  }

  if (typeShapes && typeShapes.length) {
    gsap.set(typeShapes, { autoAlpha: 0, y: 10 });
    intro.to(typeShapes, {
      autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out',
      stagger: 0.014,
    }, '-=0.5');
  }

  intro
    .to('.preloader__inner', { autoAlpha: 0, scale: 0.96, duration: 0.5, ease: 'power2.in' }, '+=0.35')
    .to('#preloader', {
      yPercent: -100, duration: 0.9, ease: 'power4.inOut',
      onComplete: () => gsap.set('#preloader', { display: 'none' }),
    }, '-=0.1')
    .add(() => document.getElementById('nav').classList.add('is-ready'), '-=0.45')
    .to('.hero__media img', { scale: 1, duration: 2.4, ease: 'power2.out' }, '-=0.7')
    .to('.hero__kicker span', { yPercent: 0, duration: 0.8 }, '-=2.2')
    .to(heroChars1, { yPercent: 0, duration: 1.0, stagger: 0.022 }, '-=0.65')
    .to(heroChars2, { yPercent: 0, duration: 1.0, stagger: 0.022 }, '-=0.85')
    .to(['.hero__sub', '.hero__cta', '.hero__scrollhint'], {
      autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1,
    }, '-=0.6');
}

if (prefersReduced) {
  gsap.set('#preloader', { display: 'none' });
  document.getElementById('nav').classList.add('is-ready');
} else {
  gsap.set('.hero__kicker span', { yPercent: 120 });
  gsap.set([heroChars1, heroChars2], { yPercent: 115 });
  gsap.set(['.hero__sub', '.hero__cta', '.hero__scrollhint'], { autoAlpha: 0, y: 24 });
  gsap.set('.hero__media img', { scale: 1.14 });

  // Secondary-Logo laden: Bildmarke (Maserung) + Schriftmarke getrennt animieren
  fetch('assets/logos/logo-secondary-full-sand.svg')
    .then((r) => r.text())
    .then((svg) => {
      const mount = document.getElementById('preloader-mark');
      mount.innerHTML = svg;
      const svgEl = mount.querySelector('svg');
      const markShapes = svgEl.querySelectorAll('#M87ntM path, #M87ntM ellipse');
      const typeShapes = [...svgEl.querySelectorAll('path, ellipse')].filter((el) => !el.closest('#M87ntM'));
      buildIntro(markShapes, typeShapes);
    })
    .catch(() => buildIntro(null, null));
}

/* ------------------------------------------------------------
   Navigation: hide on scroll down / solid after hero
   ------------------------------------------------------------ */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 'top -80',
  onUpdate: (self) => {
    if (menuOpen) return;
    nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 300);
  },
});
ScrollTrigger.create({
  start: 'top -120',
  toggleClass: { targets: '#nav', className: 'is-solid' },
});

/* Mobile Menu */
const burger = document.getElementById('burger');
const menu = document.getElementById('mobilemenu');
let menuOpen = false;
const menuTl = gsap.timeline({ paused: true })
  .set(menu, { visibility: 'visible' })
  .to(menu, { clipPath: 'inset(0% 0 0% 0)', duration: 0.7, ease: 'power4.inOut' })
  .from(menu.querySelectorAll('nav a'), {
    yPercent: 60, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out',
  }, '-=0.25')
  .from('.mobilemenu__meta', { autoAlpha: 0, y: 16, duration: 0.4 }, '-=0.2');

gsap.set(menu, { clipPath: 'inset(0 0 100% 0)' });

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  burger.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  menuTl.reverse();
  if (lenis) lenis.start();
}
burger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  burger.classList.toggle('is-open', menuOpen);
  burger.setAttribute('aria-expanded', String(menuOpen));
  if (menuOpen) { menuTl.play(); nav.classList.remove('is-hidden'); if (lenis) lenis.stop(); }
  else { menuTl.reverse(); if (lenis) lenis.start(); }
});

/* ------------------------------------------------------------
   Marquee
   ------------------------------------------------------------ */
(function initMarquee() {
  const track = document.getElementById('marquee-track');
  const group = track.querySelector('.marquee__group');
  for (let i = 0; i < 3; i++) track.appendChild(group.cloneNode(true));
  if (prefersReduced) return;
  gsap.to(track, { xPercent: -25, duration: 22, ease: 'none', repeat: -1 });
})();

/* ------------------------------------------------------------
   Manifest: Wort-für-Wort Scrub
   ------------------------------------------------------------ */
const manifestWords = splitWords(document.getElementById('manifest-text'));
gsap.to(manifestWords, {
  opacity: 1,
  stagger: 0.06,
  ease: 'none',
  scrollTrigger: {
    trigger: '#manifest-text',
    start: 'top 78%',
    end: 'bottom 45%',
    scrub: 0.6,
  },
});

/* ------------------------------------------------------------
   Section-Titles: Wort-Stagger (erhält <em>/<br>)
   ------------------------------------------------------------ */
function splitTitleWords(el) {
  const process = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'tword';
          s.textContent = part;
          frag.appendChild(s);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        process(child);
      }
    });
  };
  process(el);
  return el.querySelectorAll('.tword');
}

gsap.utils.toArray('.section-title').forEach((title) => {
  const words = splitTitleWords(title);
  gsap.from(words, {
    yPercent: 80, autoAlpha: 0,
    duration: 0.85, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: title, start: 'top 86%', once: true },
  });
});

/* ------------------------------------------------------------
   Generische Reveals
   ------------------------------------------------------------ */
function revealUp(targets, trigger, opts = {}) {
  gsap.from(targets, {
    autoAlpha: 0, y: 44, duration: 0.9, ease: 'power3.out',
    stagger: opts.stagger ?? 0.1,
    scrollTrigger: { trigger: trigger, start: opts.start ?? 'top 80%', once: true },
  });
}

revealUp('.manifest__values .value', '.manifest__values', { stagger: 0.12 });
revealUp('.werkstatt__body > :not(.section-title)', '.werkstatt__body', { stagger: 0.08 });
revealUp('.portfolio__head > :not(.section-title)', '.portfolio__head');
revealUp('.team__body > :not(.section-title)', '.team__body', { stagger: 0.08 });
revealUp('.team__imgcol', '.team');
revealUp('.process__head > :not(.section-title)', '.process__head');
revealUp('.contact__head > :not(.section-title)', '.contact__head');
revealUp('.funnel', '.funnel', { start: 'top 88%' });
revealUp('.contact__aside > *', '.contact__aside', { stagger: 0.09, start: 'top 85%' });
gsap.utils.toArray('.step').forEach((step) => {
  gsap.from([step.querySelector('.step__num'), ...step.querySelectorAll('.step__body > *')], {
    autoAlpha: 0, y: 36, duration: 0.8, stagger: 0.14, ease: 'power3.out',
    scrollTrigger: { trigger: step, start: 'top 85%', once: true },
  });
});
gsap.from(['.footer__logo', '.footer__col'], {
  autoAlpha: 0, y: 32, duration: 0.8, stagger: 0.12, ease: 'power3.out',
  scrollTrigger: { trigger: '.footer__top', start: 'top 92%', once: true },
});
gsap.utils.toArray('.pitem').forEach((item) => {
  gsap.from(item, {
    autoAlpha: 0, y: 60, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: item, start: 'top 88%', once: true },
  });
  gsap.from(item.querySelector('img'), {
    scale: 1.18, duration: 1.4, ease: 'power2.out',
    scrollTrigger: { trigger: item, start: 'top 88%', once: true },
  });
});

/* ------------------------------------------------------------
   Services: Horizontal-Scroll (nur Desktop)
   ------------------------------------------------------------ */
const mm = gsap.matchMedia();
mm.add('(min-width: 900px)', () => {
  const track = document.getElementById('services-track');
  const pin = document.getElementById('services-pin');
  const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -getDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.services',
      pin: pin,
      start: 'top top',
      end: () => '+=' + (getDistance() + window.innerHeight * 0.4),
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        gsap.set('#services-progress', { width: (self.progress * 100) + '%' });
      },
    },
  });

  gsap.from('.services__head > :not(.section-title)', {
    autoAlpha: 0, y: 40, duration: 0.9, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.services', start: 'top 70%', once: true },
  });

  return () => tween.scrollTrigger?.kill();
});

mm.add('(max-width: 899px)', () => {
  revealUp('.services__head > :not(.section-title)', '.services__head');
  revealUp('.service', '.services__track', { stagger: 0.08, start: 'top 85%' });
});

/* ------------------------------------------------------------
   Werkstatt: Parallax + Counter
   ------------------------------------------------------------ */
if (!prefersReduced) {
  gsap.to('.hero__media img', {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.werkstatt__img img', {
    yPercent: -9, ease: 'none',
    scrollTrigger: { trigger: '.werkstatt', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.to('.statement__bg img', {
    yPercent: -11, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.breaker__media img', { yPercent: -18 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.breaker', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

gsap.utils.toArray('.stat__num').forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target, duration: 1.6, ease: 'power2.out',
        snap: { innerText: 1 },
      });
    },
  });
});

/* ------------------------------------------------------------
   Statement: Zeilen-Reveal
   ------------------------------------------------------------ */
const stWords = splitWords(document.querySelector('[data-split-lines]'));
gsap.from(stWords, {
  autoAlpha: 0, y: 36, rotateX: -30, transformOrigin: '50% 100%',
  duration: 0.9, stagger: 0.045, ease: 'power3.out',
  scrollTrigger: { trigger: '.statement', start: 'top 60%', once: true },
});
gsap.from('.statement .btn', {
  autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out',
  scrollTrigger: { trigger: '.statement', start: 'top 45%', once: true },
});

/* ------------------------------------------------------------
   Portfolio-Lightbox
   ------------------------------------------------------------ */
(function initLightbox() {
  const GALLERIES = {
    masskueche: { title: 'Maßküche', images: ['portfolio-01-masskueche.jpg', 'lb-kueche-2.jpg', 'service-kueche.jpg', 'hero-kueche-duo.jpg'] },
    esstisch: { title: 'Esstisch', images: ['portfolio-05-esstisch.jpg', 'lb-esstisch-2.jpg', 'lb-esstisch-3.jpg', 'lb-esstisch-4.jpg'] },
    eckbank: { title: 'Eckbank', images: ['portfolio-03-eckbank.jpg', 'lb-eckbank-2.jpg', 'lb-eckbank-3.jpg', 'lb-eckbank-4.jpg'] },
    treppe: { title: 'Treppenbau', images: ['portfolio-09-treppe.jpg', 'lb-treppe-2.jpg', 'lb-treppe-3.jpg', 'lb-treppe-4.jpg'] },
    einbauschrank: { title: 'Einbauschrank', images: ['portfolio-04-einbauschrank.jpg', 'service-innenausbau.jpg', 'lb-einbau-2.jpg', 'lb-einbau-3.jpg'] },
    badschrank: { title: 'Badschrank', images: ['portfolio-02-badschrank.jpg', 'lb-badschrank-2.jpg', 'lb-badschrank-3.jpg'] },
  };

  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  const title = document.getElementById('lb-title');
  const counter = document.getElementById('lb-counter');
  let current = null;
  let index = 0;
  let isOpen = false;

  function render(dir = 0) {
    const g = GALLERIES[current];
    const src = 'assets/img/' + g.images[index];
    title.textContent = g.title;
    counter.textContent = `${index + 1} / ${g.images.length}`;
    if (dir === 0) {
      img.src = src;
      img.alt = `${g.title} — Bild ${index + 1}`;
      return;
    }
    gsap.to(img, {
      autoAlpha: 0, x: -26 * dir, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        img.src = src;
        img.alt = `${g.title} — Bild ${index + 1}`;
        gsap.fromTo(img, { autoAlpha: 0, x: 26 * dir }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' });
      },
    });
  }

  function open(key) {
    if (!GALLERIES[key]) return;
    current = key;
    index = 0;
    render(0);
    isOpen = true;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    gsap.fromTo(lb, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo('.lightbox__stage', { scale: 0.94, y: 18 }, { scale: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    gsap.to(lb, {
      autoAlpha: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        lb.classList.remove('is-open');
        lb.setAttribute('aria-hidden', 'true');
        gsap.set(lb, { clearProps: 'all' });
      },
    });
    if (lenis) lenis.start();
  }

  function step(dir) {
    const g = GALLERIES[current];
    index = (index + dir + g.images.length) % g.images.length;
    render(dir);
  }

  document.querySelectorAll('.pitem[data-project]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      open(item.dataset.project);
    });
  });

  document.getElementById('lb-prev').addEventListener('click', () => step(-1));
  document.getElementById('lb-next').addEventListener('click', () => step(1));
  lb.querySelectorAll('[data-lb-close]').forEach((el) => el.addEventListener('click', close));
  document.getElementById('lb-cta').addEventListener('click', (e) => {
    e.preventDefault();
    close();
    scrollToTarget('#kontakt');
  });

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // Touch-Swipe
  let touchX = null;
  lb.addEventListener('pointerdown', (e) => { touchX = e.clientX; }, { passive: true });
  lb.addEventListener('pointerup', (e) => {
    if (touchX === null) return;
    const dx = e.clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

/* ------------------------------------------------------------
   Kontakt-Funnel
   ------------------------------------------------------------ */
(function initFunnel() {
  const form = document.getElementById('funnel');
  const steps = [...form.querySelectorAll('.fstep')];
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const progress = document.getElementById('funnel-progress');
  const stepLabel = document.getElementById('funnel-step-label');
  const TOTAL = 4;
  let current = 1;

  function getStep(n) { return steps.find((s) => +s.dataset.step === n); }

  function validate(n) {
    const step = getStep(n);
    step.classList.remove('show-error');
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

    if (n === 1) {
      if (!form.projektart.value) { step.classList.add('show-error'); return false; }
    }
    if (n === 2) {
      const desc = form.beschreibung;
      if (!desc.value.trim()) {
        desc.classList.add('is-invalid');
        step.classList.add('show-error');
        return false;
      }
    }
    if (n === 3) {
      let ok = true;
      if (!form.name.value.trim()) { form.name.classList.add('is-invalid'); ok = false; }
      const email = form.email.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        form.email.classList.add('is-invalid'); ok = false;
      }
      if (!ok) step.classList.add('show-error');
      return ok;
    }
    return true;
  }

  function buildSummary() {
    const dl = document.getElementById('funnel-summary');
    const rows = [
      ['Projekt', form.projektart.value],
      ['Beschreibung', form.beschreibung.value.trim()],
      ['Zeitrahmen', form.zeitrahmen.value],
      ['Name', form.name.value.trim()],
      ['E-Mail', form.email.value.trim()],
    ];
    if (form.telefon.value.trim()) rows.push(['Telefon', form.telefon.value.trim()]);
    if (form.ort.value.trim()) rows.push(['Wohnort', form.ort.value.trim()]);
    dl.innerHTML = rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd></div>`)
      .join('');
  }

  function show(n, dir = 1) {
    const prev = form.querySelector('.fstep.is-active');
    const next = getStep(n);
    if (prev === next) return;

    if (prev) {
      gsap.to(prev, {
        autoAlpha: 0, x: -28 * dir, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          prev.classList.remove('is-active');
          gsap.set(prev, { clearProps: 'all' });
          next.classList.add('is-active');
          gsap.fromTo(next, { autoAlpha: 0, x: 28 * dir }, { autoAlpha: 1, x: 0, duration: 0.45, ease: 'power3.out' });
          gsap.from(next.querySelectorAll('.opt, .field, .funnel__summary > div, .funnel__privacy'), {
            autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.08,
            clearProps: 'all',
          });
        },
      });
    } else {
      next.classList.add('is-active');
    }

    const pct = Math.min(n, TOTAL) / TOTAL * 100;
    progress.style.width = pct + '%';
    stepLabel.textContent = n <= TOTAL ? `Schritt ${n} von ${TOTAL}` : 'Gesendet';
    btnBack.disabled = n === 1;
    btnNext.textContent = n === TOTAL ? 'Anfrage senden' : 'Weiter';
  }

  btnNext.addEventListener('click', () => {
    if (!validate(current)) return;
    if (current === 3) buildSummary();
    if (current === TOTAL) { send(); return; }
    current++;
    show(current, 1);
  });

  btnBack.addEventListener('click', () => {
    if (current === 1) return;
    current--;
    show(current, -1);
  });

  // Auswahl in Schritt 1 springt automatisch weiter
  form.querySelectorAll('input[name="projektart"]').forEach((input) => {
    input.addEventListener('change', () => {
      setTimeout(() => { if (current === 1) { current = 2; show(2, 1); } }, 350);
    });
  });

  // Vorauswahl über data-service-Links (Portfolio/Services)
  document.querySelectorAll('[data-service]').forEach((el) => {
    el.addEventListener('click', () => {
      const val = el.dataset.service;
      const match = form.querySelector(`input[name="projektart"][value="${val}"]`);
      if (match && current === 1) {
        match.checked = true;
        current = 2;
        show(2, 1);
      }
    });
  });

  function send() {
    const subject = encodeURIComponent(`Projektanfrage: ${form.projektart.value} — ${form.name.value.trim()}`);
    const body = encodeURIComponent(
      `Projektart: ${form.projektart.value}\n` +
      `Zeitrahmen: ${form.zeitrahmen.value}\n\n` +
      `Beschreibung:\n${form.beschreibung.value.trim()}\n\n` +
      `Name: ${form.name.value.trim()}\n` +
      `E-Mail: ${form.email.value.trim()}\n` +
      (form.telefon.value.trim() ? `Telefon: ${form.telefon.value.trim()}\n` : '') +
      (form.ort.value.trim() ? `Wohnort: ${form.ort.value.trim()}\n` : '')
    );
    // Versand: mailto als Funnel-Abschluss (Backend/Webflow-Form wird beim Go-Live angebunden)
    window.location.href = `mailto:info@schreinerei-gleinig.de?subject=${subject}&body=${body}`;

    document.getElementById('success-name').textContent = form.name.value.trim().split(' ')[0];
    document.getElementById('funnel-nav').style.display = 'none';
    progress.style.width = '100%';
    stepLabel.textContent = 'Gesendet';
    const prev = form.querySelector('.fstep.is-active');
    prev.classList.remove('is-active');
    const success = form.querySelector('.funnel__success');
    success.classList.add('is-active');
    gsap.fromTo(success, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' });
  }
})();

/* ------------------------------------------------------------
   Refresh nach Font-Load (Layout-Shifts vermeiden)
   ------------------------------------------------------------ */
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
