/* ============================================================
   ABT Shop Pitch — Motion-Engine
   Lenis Smooth Scroll + GSAP ScrollTrigger, deklarativ via data-*
   ============================================================ */
(() => {
  "use strict";

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("no-motion");

  /* ---------- Text-Splitter (Wörter / Zeichen) ---------- */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    return words.map((w) => {
      const wrap = document.createElement("span");
      wrap.className = "word";
      const inner = document.createElement("span");
      inner.textContent = w;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      el.appendChild(document.createTextNode(" "));
      return inner;
    });
  }

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (!reduceMotion) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else document.querySelector(target)?.scrollIntoView();
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        scrollTo(id);
      }
    });
  });

  /* ---------- Preloader ---------- */
  const preloader = document.querySelector(".preloader");
  const heroIntro = () => {
    const title = document.querySelector("[data-hero-title]");
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    if (title) {
      title.querySelectorAll(".line > span").forEach((line, i) => {
        tl.fromTo(line, { yPercent: 110 }, { yPercent: 0, duration: 1.1 }, 0.08 * i);
      });
    }
    tl.fromTo(
      "[data-hero-fade]",
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.09 },
      0.45
    );
    return tl;
  };

  if (preloader && !reduceMotion) {
    document.documentElement.style.overflow = "hidden";
    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.style.overflow = "";
        preloader.remove();
      },
    });
    tl.to(".preloader-bar i", { scaleX: 1, duration: 0.9, ease: "power2.inOut" })
      .to(".preloader svg", { opacity: 0, y: -14, duration: 0.4, ease: "power2.in" }, "+=0.15")
      .to(".preloader-bar", { opacity: 0, duration: 0.3 }, "<")
      .to(preloader, { yPercent: -100, duration: 0.75, ease: "power4.inOut" })
      .add(heroIntro(), "-=0.45");
  } else {
    preloader?.remove();
    if (!reduceMotion) heroIntro();
  }

  /* ---------- Navigation ---------- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  const burger = document.querySelector(".nav-burger");
  const mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    const links = mobileMenu.querySelectorAll("a");
    gsap.set(mobileMenu, { clipPath: "inset(0 0 100% 0)" });
    let open = false;
    burger.addEventListener("click", () => {
      open = !open;
      burger.classList.toggle("is-open", open);
      if (open) {
        lenis?.stop();
        gsap.set(mobileMenu, { visibility: "visible" });
        gsap.to(mobileMenu, { clipPath: "inset(0 0 0% 0)", duration: 0.6, ease: "power4.inOut" });
        gsap.fromTo(links, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.25, ease: "power3.out" });
      } else {
        lenis?.start();
        gsap.to(mobileMenu, {
          clipPath: "inset(0 0 100% 0)", duration: 0.5, ease: "power4.inOut",
          onComplete: () => gsap.set(mobileMenu, { visibility: "hidden" }),
        });
      }
    });
  }

  /* ---------- Redline-Indikator (Scroll = Drehzahl) ---------- */
  const redline = document.querySelector(".redline");
  if (redline) {
    const fill = redline.querySelector(".redline-fill");
    const value = redline.querySelector(".redline-value");
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(fill, { scaleY: p });
        value.textContent = (p * 8).toFixed(1);
        redline.classList.toggle("is-max", p > 0.86);
      },
    });
  }

  /* ---------- Velocity-Skew (Motor-Vibe) ---------- */
  if (!reduceMotion) {
    const skewTargets = document.querySelectorAll("[data-skew]");
    if (skewTargets.length) {
      const proxy = { skew: 0 };
      const skewSetters = [...skewTargets].map((el) => gsap.quickSetter(el, "skewY", "deg"));
      const clamp = gsap.utils.clamp(-1.6, 1.6);
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const skew = clamp(self.getVelocity() / -420);
          if (Math.abs(skew) > Math.abs(proxy.skew)) {
            proxy.skew = skew;
            gsap.to(proxy, {
              skew: 0, duration: 0.7, ease: "power3", overwrite: true,
              onUpdate: () => skewSetters.forEach((set) => set(proxy.skew)),
            });
          }
        },
      });
    }
  }

  /* ---------- Generische Reveals ---------- */
  if (!reduceMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 44 },
        {
          opacity: 1, y: 0, duration: 1.05, ease: "power3.out",
          delay: parseFloat(el.dataset.reveal) || 0,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }
      );
    });
    document.querySelectorAll("[data-reveal-img]").forEach((el) => {
      const img = el.querySelector("img, video");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 82%", once: true } });
      tl.fromTo(el, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.15, ease: "power4.inOut" });
      if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.15, ease: "power4.inOut" }, 0);
    });
    // Parallax auf Medien
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const strength = parseFloat(el.dataset.parallax) || 12;
      gsap.fromTo(
        el,
        { yPercent: -strength },
        {
          yPercent: strength, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    });
  }

  /* ---------- Marquee ---------- */
  document.querySelectorAll(".marquee").forEach((mq) => {
    const track = mq.querySelector(".marquee-track");
    if (!track || reduceMotion) return;
    // Inhalt duplizieren bis 2x Viewport
    const base = track.innerHTML;
    while (track.scrollWidth < window.innerWidth * 2.2) track.innerHTML += base;
    const tween = gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: mq, start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        tween.timeScale(gsap.utils.clamp(0.4, 4, Math.abs(self.getVelocity() / 260) + 1) * (self.direction || 1));
        gsap.to(tween, { timeScale: self.direction || 1, duration: 0.9, overwrite: "auto" });
      },
    });
  });

  /* ---------- Showcase-Slider ---------- */
  document.querySelectorAll("[data-showcase]").forEach((root) => {
    const slides = [...root.querySelectorAll(".showcase-slide")];
    if (slides.length < 2) return;
    const titleEl = root.querySelector(".showcase-title");
    const countEl = root.querySelector(".showcase-count b");
    const progress = root.querySelector(".showcase-progress i");
    const AUTO = 6.5;
    let current = 0;
    let busy = false;
    let autoTween = null;

    const titles = slides.map((s) => s.dataset.title || "");

    function setTitle(text, dir) {
      titleEl.textContent = text;
      const words = splitWords(titleEl);
      gsap.fromTo(words, { yPercent: 115 * dir }, { yPercent: 0, duration: 0.85, stagger: 0.05, ease: "power4.out" });
    }

    function startAuto() {
      if (reduceMotion) return;
      autoTween?.kill();
      gsap.set(progress, { scaleX: 0 });
      autoTween = gsap.to(progress, { scaleX: 1, duration: AUTO, ease: "none", onComplete: () => go(current + 1) });
    }

    function go(index, viaUser) {
      if (busy) return;
      const next = (index + slides.length) % slides.length;
      if (next === current) return;
      busy = true;
      const dir = index > current ? 1 : -1;
      const from = slides[current];
      const to = slides[next];
      const toImg = to.querySelector("img");
      to.classList.add("is-active");
      gsap.set(to, { zIndex: 2 });
      gsap.set(from, { zIndex: 1 });
      if (reduceMotion) {
        from.classList.remove("is-active");
        current = next;
        busy = false;
        countEl.textContent = String(next + 1).padStart(2, "0");
        titleEl.textContent = titles[next];
        return;
      }
      gsap.fromTo(
        to,
        { clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0%)", duration: 1.05, ease: "power4.inOut",
          onComplete: () => {
            from.classList.remove("is-active");
            gsap.set([from, to], { clearProps: "zIndex" });
            busy = false;
          },
        }
      );
      if (toImg) gsap.fromTo(toImg, { scale: 1.22, xPercent: 6 * dir }, { scale: 1, xPercent: 0, duration: 1.25, ease: "power3.out" });
      setTitle(titles[next], dir);
      countEl.textContent = String(next + 1).padStart(2, "0");
      current = next;
      startAuto();
    }

    // Init
    slides[0].classList.add("is-active");
    countEl.textContent = "01";
    setTitle(titles[0], 1);
    ScrollTrigger.create({
      trigger: root, start: "top 75%", once: true,
      onEnter: () => startAuto(),
    });

    root.querySelector("[data-next]")?.addEventListener("click", () => go(current + 1, true));
    root.querySelector("[data-prev]")?.addEventListener("click", () => go(current - 1, true));

    // Drag
    let startX = null;
    root.addEventListener("pointerdown", (e) => { startX = e.clientX; root.classList.add("is-dragging"); });
    window.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      root.classList.remove("is-dragging");
      if (Math.abs(dx) > 60) go(current + (dx < 0 ? 1 : -1), true);
      startX = null;
    });

    // Tastatur
    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(current + 1, true);
      if (e.key === "ArrowLeft") go(current - 1, true);
    });
  });

  /* ---------- Cinema (pinned Video-Story) ---------- */
  document.querySelectorAll("[data-cinema]").forEach((root) => {
    const stage = root.querySelector(".cinema-stage");
    const videos = [...root.querySelectorAll(".cinema-video")];
    const caption = root.querySelector(".cinema-caption");
    if (!stage || reduceMotion) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root, start: "top top",
        end: () => "+=" + window.innerHeight * (videos.length + 0.5),
        pin: stage, scrub: 0.6, pinSpacing: true,
      },
    });
    if (caption) {
      tl.fromTo(caption, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.8 }, 0);
    }
    videos.forEach((v, i) => {
      if (i === 0) return;
      tl.fromTo(v, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 1 }, i);
    });
  });

  /* ---------- Story (PDP pinned Kapitel) ---------- */
  document.querySelectorAll("[data-story]").forEach((root) => {
    const stage = root.querySelector(".story-stage");
    const imgs = [...root.querySelectorAll(".story-media img")];
    const steps = [...root.querySelectorAll(".story-step")];
    const indexEl = root.querySelector(".story-index");
    if (!stage || !steps.length) return;
    if (reduceMotion) {
      steps.forEach((s) => gsap.set(s, { position: "relative", opacity: 1, visibility: "visible", left: 0, bottom: 0 }));
      return;
    }
    gsap.set(steps[0], { opacity: 1, visibility: "visible" });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root, start: "top top",
        end: () => "+=" + window.innerHeight * steps.length * 1.1,
        pin: stage, scrub: 0.6,
        onUpdate: (self) => {
          if (indexEl) {
            const i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
            indexEl.textContent = String(i + 1).padStart(2, "0");
          }
        },
      },
    });
    steps.forEach((step, i) => {
      if (i === 0) return;
      const pos = i;
      tl.to(steps[i - 1], { opacity: 0, y: -30, visibility: "hidden", duration: 0.35 }, pos - 0.2);
      tl.fromTo(step, { opacity: 0, y: 40, visibility: "hidden" }, { opacity: 1, y: 0, visibility: "visible", duration: 0.4 }, pos);
      if (imgs[i]) tl.fromTo(imgs[i], { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.55 }, pos - 0.1);
    });
    tl.to({}, { duration: 0.4 }); // Ausklang
  });

  /* ---------- Horizontal-Scroll (Marken, Über uns) ---------- */
  document.querySelectorAll("[data-hscroll]").forEach((root) => {
    const track = root.querySelector(".brands-track");
    if (!track) return;
    if (reduceMotion) { track.style.flexWrap = "wrap"; track.style.height = "auto"; return; }
    const getAmount = () => -(track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: getAmount, ease: "none",
      scrollTrigger: {
        trigger: root, start: "top top",
        end: () => "+=" + (track.scrollWidth - window.innerWidth),
        pin: true, scrub: 0.5, invalidateOnRefresh: true,
      },
    });
  });

  /* ---------- Wort-Reveal (Made in Germany) ---------- */
  document.querySelectorAll("[data-words]").forEach((el) => {
    const words = splitWords(el);
    words.forEach((w) => w.parentElement.classList.add("w"));
    if (reduceMotion) { el.querySelectorAll(".w").forEach((w) => (w.style.opacity = 1)); return; }
    gsap.to(el.querySelectorAll(".w"), {
      opacity: 1, stagger: 0.06, ease: "none",
      scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 45%", scrub: 0.4 },
    });
  });

  /* ---------- Zähler ---------- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 82%", once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: target, duration: reduceMotion ? 0 : 2.2, ease: "power3.out",
          onUpdate: () => (el.firstChild.textContent = Math.round(obj.v).toLocaleString("de-DE")),
        }),
    });
  });

  /* ---------- FAQ ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    q.setAttribute("aria-expanded", "false");
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      // Andere schließen
      item.parentElement.querySelectorAll(".faq-item.is-open").forEach((other) => {
        if (other === item) return;
        other.classList.remove("is-open");
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        gsap.to(other.querySelector(".faq-a"), { height: 0, duration: 0.45, ease: "power3.inOut" });
      });
      item.classList.toggle("is-open", !isOpen);
      q.setAttribute("aria-expanded", String(!isOpen));
      gsap.to(a, {
        height: isOpen ? 0 : a.scrollHeight, duration: 0.5, ease: "power3.inOut",
        onComplete: () => { if (!isOpen) { a.style.height = "auto"; ScrollTrigger.refresh(); } },
      });
    });
  });

  /* ---------- Videos: nur im Viewport abspielen ---------- */
  const vids = document.querySelectorAll("video[autoplay]");
  const vio = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }),
    { rootMargin: "80px" }
  );
  vids.forEach((v) => vio.observe(v));

  /* ---------- Bilder geladen → Refresh ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
