/* Taj Class — home page */
(() => {
  "use strict";
  const T = window.Taj, D = T.D, { $, esc } = T;
  // the intro plays on every load, so a refresh always starts from the top instead of the old scroll position
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const plusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const addBtn = (id) => {
    const on = T.inBasket("p:" + id);
    return `<button class="card__add${on ? " is-added" : ""}" type="button" data-add="${id}">${on ? checkIcon : plusIcon}<span>${on ? T.t().added : T.t().add}</span></button>`;
  };

  /* ---------- vitrine (featured) ---------- */
  function renderVitrine() {
    const items = D.PRODUCTS.filter((p) => p.featured);
    $("#vitrineTrack").innerHTML = items.map((p) => {
      const n = esc(T.name(p)), d = esc(T.desc(p));
      if (p.note) {
        return `<li class="card card--note"><div class="card__img"><h3>${n}</h3><p>${d}</p></div>
          <div class="card__body"><p class="card__desc"></p>${addBtn(p.id)}</div></li>`;
      }
      return `<li class="card">
        <a class="card__img" href="sweets.html?item=${p.id}" aria-label="${n}"><img src="assets/img/${p.img}.webp" alt="${n}" loading="lazy" width="640" height="1136"></a>
        <div class="card__body"><h3 class="card__name">${n}</h3><p class="card__desc">${d}</p>${addBtn(p.id)}</div>
      </li>`;
    }).join("") + `<li class="card card--more"><a href="sweets.html">
        <span class="card--more__mark" aria-hidden="true"><img src="assets/mark.svg" alt=""></span>
        <span class="card--more__label">${esc(T.state.lang === "ar" ? "كل الأصناف" : "All sweets")}</span>
        <span class="card--more__count">${esc(T.t().results(D.PRODUCTS.length))}</span></a></li>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const key = "p:" + b.dataset.add;
    if (T.inBasket(key)) { T.openBasket(); return; }
    T.add(key);
  });

  /* ---------- branches (compact list) ---------- */
  const mapsLink = (b) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(b.map.ll || b.map.q);
  function renderBranches() {
    $("#branchList").innerHTML = D.BRANCHES.map((b) => {
      const tag = b.hq ? `<span class="branch__tag">${T.t().hq}</span>` : b.fresh ? `<span class="branch__tag">${T.t().fresh}</span>` : "";
      const phones = b.phones.length
        ? b.phones.slice(0, 2).map(([label, tel]) => `<a href="tel:${tel}">${label}</a>`).join("")
        : `<a href="https://wa.me/${D.WA_NUMBER}" target="_blank" rel="noopener">${T.t().waOnly}</a>`;
      return `<li class="branch">
        <div><h3 class="branch__name">${esc(T.name(b))}${tag}</h3><p class="branch__area">${esc(T.L(b, "area"))}</p></div>
        <a class="branch__map" href="branches.html#${b.id}">${T.t().map}</a>
        <div class="branch__phones">${phones}</div>
      </li>`;
    }).join("");
  }

  /* ---------- instagram wall ---------- */
  $("#gramGrid").innerHTML = D.GRAM.map((g) =>
    `<a href="https://www.instagram.com/tajclaas/" target="_blank" rel="noopener" aria-label="@tajclaas"><img src="assets/img/${g}.webp" alt="" loading="lazy" width="640" height="1136"></a>`
  ).join("");

  function render() { renderVitrine(); renderBranches(); }
  T.onLang(render);
  T.onBasket(renderVitrine);

  /* ---------- vitrine: pinned horizontal scroll on wide screens ---------- */
  function setupVitrine() {
    if (!T.hasGsap || T.reduceMotion) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 961px)", () => {
      const track = $("#vitrineTrack");
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const dir = () => (document.documentElement.dir === "rtl" ? 1 : -1);
      const tween = gsap.to(track, {
        x: () => dir() * dist(), ease: "none",
        scrollTrigger: { trigger: "#vitrine", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      return () => tween.kill();
    });
  }

  /* ---------- intro ---------- */
  const intro = $("#intro");
  function heroEnter(delay = 0) {
    if (!T.hasGsap || T.reduceMotion) return;
    gsap.from(".hero__title span", { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.14, ease: "power3.out", delay });
    gsap.from([".hero__sub", ".hero__cta"], { y: 18, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power2.out", delay: delay + 0.35 });
    gsap.from(".bar", { y: -30, opacity: 0, duration: 0.8, ease: "power2.out", delay: delay + 0.2 });
  }
  const toTop = () => { if (!location.hash) { window.scrollTo(0, 0); T.lenis?.scrollTo(0, { immediate: true, force: true }); } };
  function endIntro() {
    toTop();
    intro.classList.add("is-gone");
    document.body.classList.remove("is-locked");
    T.lenis?.start();
  }
  async function runIntro() {
    // plays on every load of the home page; only skipped for visitors who ask for reduced motion
    if (T.reduceMotion || !T.hasGsap) { endIntro(); heroEnter(0.1); return; }

    toTop();

    document.body.classList.add("is-locked");
    T.lenis?.stop();
    let svgText;
    try { svgText = await (await fetch("assets/mark.svg")).text(); } catch { endIntro(); heroEnter(); return; }
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const mark = $("#introMark");
    mark.innerHTML = `<defs><linearGradient id="goldFill" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#F3DE9E"/><stop offset=".45" stop-color="#D4AE5A"/><stop offset=".8" stop-color="#A8812F"/><stop offset="1" stop-color="#E2C47A"/></linearGradient></defs>`;
    doc.querySelectorAll("path").forEach((p) => mark.appendChild(document.importNode(p, true)));
    const paths = [...mark.querySelectorAll("path")];
    paths.forEach((p) => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });

    const photo = $("#introPhoto");
    gsap.set("#introLine", { y: 12 });
    const tl = gsap.timeline({ onComplete: endIntro });
    tl.to(paths, { strokeDashoffset: 0, duration: 2, stagger: 0.12, ease: "power2.inOut" })
      .to(paths, { fill: "url(#goldFill)", duration: 0.6, ease: "power1.out" }, "-=0.35")
      .to("#introLine", { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.3")
      .to(photo, { opacity: 1, duration: 0.7, ease: "power1.inOut" }, "+=0.25")
      .to(paths, { opacity: 0, duration: 0.5 }, "<0.2")
      .to("#introLine", { opacity: 0, duration: 0.4 }, "+=0.35")
      .addLabel("zoom")
      .to(photo, { scale: 26, duration: 1.3, ease: "power3.in" }, "zoom")
      .to(intro, { backgroundColor: "rgba(26,19,11,0)", duration: 0.5 }, "zoom+=0.8")
      .to(photo, { opacity: 0, duration: 0.35 }, "zoom+=1.05")
      .add(() => heroEnter(0), "zoom+=0.95");
    gsap.from(".hero__img", { scale: 1.12, duration: 2.2, ease: "power2.out", delay: tl.duration() - 0.4 });

    const skip = () => tl.progress(1);
    $("#introSkip").addEventListener("click", skip, { once: true });
    intro.addEventListener("click", skip, { once: true });
  }

  T.applyLang();
  setupVitrine();
  runIntro();
  window.addEventListener("load", () => T.hasGsap && ScrollTrigger.refresh());
})();
