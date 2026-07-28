/* AIfluence — camada de movimento
   Progressive enhancement: se o GSAP nao carregar, a pagina continua
   inteira e legivel. Nada aqui esconde conteudo antes de confirmar
   que a biblioteca chegou. */
(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 760px)").matches;

  /* ------------------------------------------------------------------
     1. CAMPO DE PARTICULAS
     Reescrito. A versao anterior chamava sizeCanvas() dentro do loop de
     desenho, e atribuir canvas.width realoca o buffer inteiro e reseta o
     contexto — 60x por segundo. Agora dimensiona so no init e no resize.
  ------------------------------------------------------------------ */
  const canvas = document.getElementById("fx");
  if (canvas && !reduce) {
    const ctx = canvas.getContext("2d", { alpha: true });
    let w = 0, h = 0, nodes = [], raf = 0, running = false;

    const LINK_DIST = mobile ? 96 : 130;
    const MAX_NODES = mobile ? 26 : 58;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build() {
      const n = Math.min(MAX_NODES, Math.round((w * h) / 18000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.5 + Math.random() * 1.4,
        col: Math.random() < 0.5 ? "rgba(0,218,132,.55)" : "rgba(10,137,185,.55)"
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const ns = nodes, len = ns.length, dd = LINK_DIST * LINK_DIST;

      ctx.lineWidth = 1;
      for (let i = 0; i < len; i++) {
        const a = ns[i];
        for (let j = i + 1; j < len; j++) {
          const b = ns[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;          // sem Math.hypot: evita sqrt
          if (d2 < dd) {
            const t = 1 - Math.sqrt(d2) / LINK_DIST;
            ctx.strokeStyle = "rgba(0,180,160," + (0.13 * t).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (let i = 0; i < len; i++) {
        const p = ns[i];
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(draw); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size(); build(); start();

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { size(); build(); }, 180);
    }, { passive: true });

    // nao desenha com a aba em segundo plano
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stop() : start();
    });
  } else if (canvas) {
    canvas.style.display = "none";
  }

  /* ------------------------------------------------------------------
     2. GSAP
  ------------------------------------------------------------------ */
  if (typeof window.gsap === "undefined" || reduce) return;
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;

  clearTimeout(window.__animFailsafe);
  document.documentElement.classList.add("anim-ready");

  const EASE = "power2.out";

  /* --- alvos de reveal ------------------------------------------------
     Cada secao vira um grupo. Se um filho direto e um grid, quem anima
     sao os cards dele (com stagger), nao o container. */
  const targetsIn = section => Array.from(section.querySelectorAll("[data-anim]"));

  const hero = document.getElementById("topo");

  document.querySelectorAll("section, header").forEach(section => {
    const targets = targetsIn(section);
    if (!targets.length) return;

    if (section === hero) return; // hero tem entrada propria, sem scroll

    gsap.set(targets, { opacity: 0, y: 22 });
    gsap.to(targets, {
      opacity: 1, y: 0,
      duration: 0.66, ease: EASE, stagger: 0.065,
      scrollTrigger: { trigger: section, start: "top 80%", once: true }
    });
  });

  /* --- entrada do hero: acontece no load, ninguem espera rolar ------- */
  if (hero) {
    const t = targetsIn(hero);
    gsap.set(t, { opacity: 0, y: 26 });
    gsap.to(t, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.09, delay: 0.1 });
  }

  /* --- carimbos de horario: a espinha da pagina ----------------------
     Unico lugar onde a animacao e distinta. O letter-spacing assenta,
     como um relogio travando no minuto. */
  document.querySelectorAll("span").forEach(el => {
    const txt = (el.textContent || "").trim();
    if (!/^\d{2}H\d{2}\s·\s/.test(txt)) return;
    gsap.fromTo(el,
      { letterSpacing: "0.42em", opacity: 0 },
      {
        letterSpacing: "0.18em", opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      }
    );
  });

  /* --- contadores ---------------------------------------------------- */
  const ptBR = (n, dec) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  document.querySelectorAll("[data-count]").forEach(el => {
    const raw = el.textContent.trim();
    const m = raw.match(/^(\D*?)([\d.]*\d(?:,\d+)?)(\D*)$/);
    if (!m) return;
    const [, pre, numStr, post] = m;
    const target = parseFloat(numStr.replace(/\./g, "").replace(",", "."));
    if (!isFinite(target) || Math.abs(target) < 2) return;   // "0" e "1 call" ficam parados
    const dec = numStr.includes(",") ? numStr.split(",")[1].length : 0;

    const box = { v: 0 };
    gsap.to(box, {
      v: Math.abs(target), duration: 1.15, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => { el.textContent = pre + ptBR(box.v, dec) + post; },
      onComplete: () => { el.textContent = raw; }   // volta ao texto exato
    });
    el.textContent = pre + ptBR(0, dec) + post;
  });

  /* --- parallax discreto nas capturas de tela ------------------------
     Faixa curta (18px) e scrub curto: o suficiente pra dar profundidade
     sem a imagem parecer atrasada em relacao ao dedo. */
  if (!mobile) {
    document.querySelectorAll('img[src*="print-"]').forEach(img => {
      gsap.fromTo(img, { y: 16 }, {
        y: -16, ease: "none",
        scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 0.6 }
      });
    });
  }

  /* --- barra de progresso de leitura --------------------------------
     Existe pra matar a sensacao de "estou preso": mostra que a pagina
     tem fim e que a rolagem esta andando. */
  const bar = document.getElementById("progress");
  if (bar) {
    gsap.to(bar, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.25 }
    });
  }

  /* --- nav condensa ao sair do topo ---------------------------------- */
  const nav = document.querySelector("nav");
  if (nav) {
    nav.id = "nav";
    const inner = nav.firstElementChild;
    ST.create({
      start: "top -40",
      end: 99999,
      onUpdate: self => {
        const on = self.scroll() > 40;
        nav.style.backgroundColor = on ? "rgba(5,5,38,.94)" : "rgba(5,5,38,.82)";
        if (inner) inner.style.padding = on ? "8px 24px" : "12px 24px";
      }
    });
  }


  /* ------------------------------------------------------------------
     3. VIDEO DO HERO, CONTROLADO PELA ROLAGEM
     Sem pin: a pagina rola normalmente e o video avanca junto. Rolar pra
     cima faz ele voltar. Como nada trava, nao existe a sensacao de
     "empurrar parede" — o video acompanha, nao sequestra.
     O arquivo tem todo frame como keyframe, senao o seek engasga.
  ------------------------------------------------------------------ */
  const hv = document.getElementById("hero-video");
  if (hv && !mobile && !reduce && !matchMedia("(prefers-reduced-data: reduce)").matches) {
    const arm = () => {
      hv.src = "assets/hero.mp4";
      hv.addEventListener("loadeddata", () => {
        hv.classList.add("on");
        const dur = isFinite(hv.duration) ? hv.duration : 6.5;
        const clock = { t: 0 };
        gsap.to(clock, {
          t: dur, ease: "none",
          scrollTrigger: {
            trigger: ".hero-wrap",
            start: "top top",
            end: "bottom top",
            scrub: 0.45
          },
          onUpdate: () => {
            if (hv.readyState >= 2) hv.currentTime = clock.t;
          }
        });
        ST.refresh();
      }, { once: true });
      hv.load();
    };
    document.readyState === "complete" ? arm() : window.addEventListener("load", arm);
  }

  /* imagens que carregam depois podem deslocar os gatilhos */
  window.addEventListener("load", () => ST.refresh());
})();
