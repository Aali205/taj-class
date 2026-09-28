/* Taj Class — gifts & hosting: occasion filter, boxes, custom box request */
(() => {
  "use strict";
  const T = window.Taj, D = T.D, { $, $$, esc } = T;
  const canFlip = T.hasGsap && !!window.Flip && !T.reduceMotion;
  const occOf = (id) => D.OCCASIONS.find((o) => o.id === id);

  const params = new URLSearchParams(location.search);
  let occ = occOf(params.get("occ")) ? params.get("occ") : "all";

  /* ---------- boxes ---------- */
  const grid = $("#boxGrid");
  const cards = {};

  function cardHTML(b) {
    const on = T.inBasket("b:" + b.id), n = esc(T.name(b));
    return `
      <figure class="bcard__media"><img src="assets/img/${b.img}.webp" alt="${n}" loading="lazy"></figure>
      <div class="bcard__body">
        <p class="bcard__occ">${b.occ.map((o) => esc(T.name(occOf(o)))).join("، ")}</p>
        <h2 class="bcard__name">${n}</h2>
        <p class="bcard__size">${esc(T.L(b, "size"))}</p>
        <p class="bcard__desc">${esc(T.desc(b))}</p>
        <div class="bcard__actions">
          <button class="btn ${on ? "btn--pistachio" : "btn--ink"}" type="button" data-box="${b.id}">${esc(on ? T.t().added : T.t().orderBox)}</button>
        </div>
      </div>`;
  }
  function build() {
    grid.innerHTML = "";
    D.BOXES.forEach((b) => {
      const li = document.createElement("li");
      li.className = "bcard"; li.dataset.flipId = b.id;
      li.innerHTML = cardHTML(b);
      cards[b.id] = li; grid.appendChild(li);
    });
  }
  const refreshText = () => D.BOXES.forEach((b) => { cards[b.id].innerHTML = cardHTML(b); });

  function renderChips() {
    const count = (id) => D.BOXES.filter((b) => id === "all" || b.occ.includes(id)).length;
    $("#occChips").innerHTML = [{ id: "all", ar: "كل المناسبات", en: "All occasions" }, ...D.OCCASIONS].map((o) => `
      <button class="chip${occ === o.id ? " is-on" : ""}" type="button" role="radio" aria-checked="${occ === o.id}" data-occ="${o.id}">
        ${esc(T.name(o))}<span class="chip__n">${T.num(count(o.id))}</span></button>`).join("");
  }

  function apply(animate = true) {
    const st = animate && canFlip ? Flip.getState(".bcard") : null;
    let n = 0;
    D.BOXES.forEach((b) => { const show = occ === "all" || b.occ.includes(occ); cards[b.id].classList.toggle("is-hidden", !show); if (show) n++; });
    if (st) {
      Flip.from(st, {
        duration: 0.6, ease: "power3.inOut", scale: true, absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.12, ease: "power2.out" }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3, ease: "power2.in" }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    }
    $("#results").textContent = T.t().boxesCount(n);
    $("#empty").hidden = n > 0;
    const p = new URLSearchParams(); if (occ !== "all") p.set("occ", occ);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
  }

  $("#occChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-occ]"); if (!c || c.dataset.occ === occ) return;
    occ = c.dataset.occ; renderChips(); apply();
    if (occ !== "all" && !builder.occ) { builder.occ = occ; renderBuilder(); }
  });

  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-box]"); if (!b) return;
    const key = "b:" + b.dataset.box;
    if (T.inBasket(key)) T.openBasket(); else T.add(key, 1);
  });

  /* ---------- custom box builder ---------- */
  const builder = { occ: occ !== "all" ? occ : null, unit: "boxes", count: 1, sweets: new Set() };
  const unitStep = () => (builder.unit === "boxes" ? 1 : 5);

  function renderBuilder() {
    $("#bOcc").innerHTML = D.OCCASIONS.map((o) => `
      <button class="chip${builder.occ === o.id ? " is-on" : ""}" type="button" role="radio" aria-checked="${builder.occ === o.id}" data-bocc="${o.id}">${esc(T.name(o))}</button>`).join("");
    $("#bOcc").setAttribute("role", "radiogroup");
    $("#bSweets").innerHTML = D.PRODUCTS.map((p) => `
      <button class="chip chip--tag${builder.sweets.has(p.id) ? " is-on" : ""}" type="button" aria-pressed="${builder.sweets.has(p.id)}" data-bsweet="${p.id}">${esc(T.name(p))}</button>`).join("");
    $$("#bUnit [data-unit]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.unit === builder.unit)));
    $("#bCount").textContent = `${T.num(builder.count)} ${builder.unit === "boxes" ? T.t().boxesUnit : T.t().guestsUnit}`;
    $("#bCountGroup").setAttribute("aria-label", T.t().count);
    $$("#bCountGroup [data-count]").forEach((b) => b.setAttribute("aria-label", b.dataset.count === "1" ? T.t().more : T.t().less));
    const sel = $("#bBranch"), prev = sel.value;
    sel.innerHTML = D.BRANCHES.map((b) => `<option value="${b.id}">${esc(T.name(b))}، ${esc(T.L(b, "area").split(/[.،]/)[0])}</option>`).join("");
    if (prev) sel.value = prev;
  }

  $("#bOcc").addEventListener("click", (e) => {
    const c = e.target.closest("[data-bocc]"); if (!c) return;
    builder.occ = c.dataset.bocc; $("#bOccErr").hidden = true; renderBuilder();
    $(`[data-bocc="${builder.occ}"]`).focus();
  });
  $("#bSweets").addEventListener("click", (e) => {
    const c = e.target.closest("[data-bsweet]"); if (!c) return;
    const id = c.dataset.bsweet;
    builder.sweets.has(id) ? builder.sweets.delete(id) : builder.sweets.add(id);
    c.classList.toggle("is-on"); c.setAttribute("aria-pressed", String(builder.sweets.has(id)));
  });
  $("#bUnit").addEventListener("click", (e) => {
    const u = e.target.closest("[data-unit]"); if (!u || u.dataset.unit === builder.unit) return;
    builder.unit = u.dataset.unit; builder.count = builder.unit === "boxes" ? 1 : 20; renderBuilder();
  });
  $("#bCountGroup").addEventListener("click", (e) => {
    const b = e.target.closest("[data-count]"); if (!b) return;
    builder.count = Math.max(unitStep(), builder.count + unitStep() * parseInt(b.dataset.count, 10));
    renderBuilder();
  });

  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  $("#bDate").min = today.toISOString().slice(0, 10);

  $("#builderForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ar = T.state.lang === "ar";
    const err = $("#bOccErr");
    if (!builder.occ) {
      err.textContent = T.t().pickOccasion; err.hidden = false;
      $("#bOcc .chip")?.focus(); return;
    }
    for (const id of ["bDate", "bName"]) {
      const f = $("#" + id);
      if (!f.value.trim()) { f.setAttribute("aria-invalid", "true"); f.focus(); T.toast(ar ? "كمّل التاريخ والاسم" : "Add the date and your name"); return; }
      f.removeAttribute("aria-invalid");
    }
    const b = D.BRANCHES.find((x) => x.id === $("#bBranch").value);
    const dateStr = new Date($("#bDate").value + "T12:00").toLocaleDateString(ar ? "ar-SY" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines = [
      ar ? "مرحبا تاج كلاس، بدي اطلب علبة خاصة:" : "Hello Taj Class, I'd like a custom box:",
      `${T.t().occasion}: ${T.name(occOf(builder.occ))}`,
      `${T.t().count}: ${T.num(builder.count)} ${builder.unit === "boxes" ? T.t().boxesUnit : T.t().guestsUnit}`,
    ];
    if (builder.sweets.size) lines.push(`${T.t().sweetsInside}: ${[...builder.sweets].map((id) => T.name(D.PRODUCTS.find((p) => p.id === id))).join(ar ? "، " : ", ")}`);
    lines.push(`${T.t().date}: ${dateStr}`, `${T.t().msgBranch}: ${T.name(b)}`, `${T.t().msgName}: ${$("#bName").value.trim()}`);
    T.wa(lines.join("\n"));
    T.toast(T.t().customSent);
  });

  /* ---------- motion ---------- */
  function motion() {
    if (!T.hasGsap || T.reduceMotion) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".gift-hero__media img", { scale: 1.15, opacity: 0, duration: 1.4 })
      .from(".gift-hero .page-title", { yPercent: 30, opacity: 0, duration: 0.9 }, 0.15)
      .from([".gift-hero .page-lede", ".gift-hero .btn"], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.4)
      .from("#occChips .chip", { y: 10, opacity: 0, duration: 0.45, stagger: 0.04 }, 0.55)
      .from(".bcard", { y: 50, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.6);

    // gentle parallax on the hero photo as the page scrolls away
    gsap.to(".gift-hero__media img", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".gift-hero", start: "top top", end: "bottom top", scrub: true } });
    // the closing photo strip drifts sideways with scroll
    gsap.fromTo(".pro-strip img", { xPercent: (i) => (i - 1) * 6 }, { xPercent: (i) => (1 - i) * 6, ease: "none",
      scrollTrigger: { trigger: ".pro-strip", start: "top bottom", end: "bottom top", scrub: true } });
    ScrollTrigger.create({ trigger: "#filters", start: "top top+=72", end: () => "+=" + ($("#boxGrid").offsetHeight), toggleClass: { targets: "#filters", className: "is-stuck" } });
  }

  T.onBasket(refreshText);
  T.onLang(() => { renderChips(); refreshText(); renderBuilder(); apply(false); });

  build();
  T.applyLang();
  motion();
})();
