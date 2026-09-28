/* Taj Class — shared behaviour for every page: language, basket, smooth scroll, header, page transitions. */
window.Taj = (() => {
  "use strict";
  const D = window.TAJ_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, ...(window.Flip ? [Flip] : []));

  /* ---------- storage: per-visitor conveniences only ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  const state = {
    lang: store.get("taj.lang", "ar") === "en" ? "en" : "ar",
    basket: store.get("taj.basket", {}), // { "p:warbat": 1.5, "b:kilo": 2 }
  };
  // migrate baskets saved before item keys were prefixed
  Object.keys(state.basket).forEach((k) => { if (!k.includes(":")) { state.basket["p:" + k] = state.basket[k]; delete state.basket[k]; } });

  const t = () => D.UI[state.lang];
  const L = (o, base = "") => o[(base || "") + (state.lang === "ar" ? (base ? "Ar" : "ar") : (base ? "En" : "en"))];
  const name = (o) => o[state.lang];
  const desc = (o) => (state.lang === "ar" ? o.dar : o.den);
  const num = (n) => D.fmtNum(n, state.lang);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- shared chrome injected once per page ---------- */
  function injectChrome() {
    document.body.insertAdjacentHTML("beforeend", `
<div class="scrim" id="scrim" hidden></div>
<aside class="basket" id="basket" aria-labelledby="basketTitle" aria-hidden="true" inert>
  <div class="basket__head">
    <h2 id="basketTitle" data-i18n="basket.h">طلبيتك</h2>
    <button class="icon-btn" id="basketClose" type="button" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
  </div>
  <ul class="basket__items" id="basketItems"></ul>
  <p class="basket__empty" id="basketEmpty" data-i18n="basket.empty">طلبيتك فاضية. اختار أصناف أو علبة وبتطلع هون.</p>
  <form class="basket__form" id="basketForm">
    <label><span data-i18n="basket.branch">استلام من فرع</span><select id="branchSelect" required></select></label>
    <label><span data-i18n="basket.name">اسمك</span><input id="custName" autocomplete="name" required></label>
    <label><span data-i18n="basket.note">ملاحظة (اختياري)</span><textarea id="custNote" rows="2"></textarea></label>
    <button class="btn btn--gold btn--wide" type="submit" data-i18n="basket.send">أرسل الطلبية على واتساب</button>
    <p class="basket__fine" data-i18n="basket.fine">بتنفتح محادثة واتساب مع الفرع وفيها طلبيتك جاهزة، وبيأكدولك السعر والموعد.</p>
  </form>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  }

  /* ---------- i18n ---------- */
  const AR = {};
  const langHandlers = [];
  function captureArabic() { $$("[data-i18n]").forEach((el) => { if (!(el.dataset.i18n in AR)) AR[el.dataset.i18n] = el.textContent; }); }
  function captureArabicAttrs() {
    $$("[data-i18n-ph]").forEach((el) => { AR["ph:" + el.dataset.i18nPh] ??= el.getAttribute("placeholder"); });
    $$("[data-i18n-label]").forEach((el) => { AR["lb:" + el.dataset.i18nLabel] ??= el.getAttribute("aria-label"); });
  }

  function applyLang() {
    const html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === "ar" ? "rtl" : "ltr";
    captureArabic(); captureArabicAttrs();
    $$("[data-i18n]").forEach((el) => { const k = el.dataset.i18n; el.textContent = state.lang === "en" ? (D.EN[k] ?? AR[k]) : AR[k]; });
    $$("[data-i18n-ph]").forEach((el) => { const k = el.dataset.i18nPh; el.setAttribute("placeholder", state.lang === "en" ? (D.EN[k] ?? AR["ph:" + k]) : AR["ph:" + k]); });
    $$("[data-i18n-label]").forEach((el) => { const k = el.dataset.i18nLabel; el.setAttribute("aria-label", state.lang === "en" ? (D.EN[k] ?? AR["lb:" + k]) : AR["lb:" + k]); });
    const title = document.body.dataset[state.lang === "ar" ? "titleAr" : "titleEn"];
    if (title) document.title = title;
    const lb = $("#langBtn");
    lb.textContent = state.lang === "ar" ? "EN" : "عربي";
    lb.setAttribute("aria-label", state.lang === "ar" ? "English" : "العربية");
    $("#basketClose").setAttribute("aria-label", t().close);
    renderBranchSelect();
    renderBasket();
    langHandlers.forEach((fn) => fn(state.lang));
    if (hasGsap) ScrollTrigger.refresh();
  }
  const onLang = (fn) => langHandlers.push(fn);

  /* ---------- basket ---------- */
  function itemFor(key) {
    const [kind, id] = key.split(":");
    if (kind === "b") { const b = D.BOXES.find((x) => x.id === id); return b && { kind, obj: b, img: `assets/img/${b.img}.webp`, step: 1 }; }
    const p = D.PRODUCTS.find((x) => x.id === id);
    return p && { kind, obj: p, img: p.img ? `assets/img/${p.img}.webp` : "assets/mark.svg", step: 0.5 };
  }
  const fmtQty = (key, q) => key.startsWith("b:") ? `${num(q)} ${t().box}` : `${num(q)} ${t().kg}`;

  function saveBasket() {
    store.set("taj.basket", state.basket);
    const c = $("#basketCount"); if (c) c.textContent = num(Object.keys(state.basket).length);
  }

  function renderBasket() {
    const keys = Object.keys(state.basket).filter((k) => itemFor(k));
    $("#basketEmpty").hidden = keys.length > 0;
    $("#basketItems").innerHTML = keys.map((k) => {
      const it = itemFor(k), q = state.basket[k], last = q <= it.step;
      return `<li class="bitem">
        <img src="${it.img}" alt="">
        <span class="bitem__name">${esc(name(it.obj))}</span>
        <span class="bitem__qty">
          <button type="button" data-qty="${k}" data-d="-1" aria-label="${last ? t().remove : t().less}">${last ? "×" : "−"}</button>
          <output>${fmtQty(k, q)}</output>
          <button type="button" data-qty="${k}" data-d="1" aria-label="${t().more}">+</button>
        </span></li>`;
    }).join("");
    saveBasket();
  }

  const basketChange = [];
  const onBasket = (fn) => basketChange.push(fn);
  const inBasket = (key) => key in state.basket;

  function add(key, qty) {
    const it = itemFor(key); if (!it) return;
    const fresh = !inBasket(key);
    state.basket[key] = qty ?? (fresh ? (it.kind === "b" ? 1 : 1) : state.basket[key]);
    renderBasket();
    toast(t().toastAdd(name(it.obj)));
    const bb = $("#basketBtn"); bb.classList.remove("bump"); void bb.offsetWidth; bb.classList.add("bump");
    basketChange.forEach((fn) => fn());
  }

  function step(key, dir) {
    const it = itemFor(key); if (!it) return;
    const next = Math.round((state.basket[key] + dir * it.step) * 2) / 2;
    if (next <= 0) delete state.basket[key]; else state.basket[key] = next;
    renderBasket();
    basketChange.forEach((fn) => fn());
  }

  function renderBranchSelect() {
    const sel = $("#branchSelect"); if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = D.BRANCHES.map((b) => `<option value="${b.id}">${esc(name(b))}، ${esc(L(b, "area").split(/[.،]/)[0])}</option>`).join("");
    if (prev) sel.value = prev;
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
  }

  const wa = (text) => window.open(`https://wa.me/${D.WA_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");

  /* ---------- drawer ---------- */
  let lastFocus;
  function openBasket() {
    const b = $("#basket"), s = $("#scrim");
    lastFocus = document.activeElement;
    s.hidden = false; requestAnimationFrame(() => s.classList.add("is-on"));
    b.classList.add("is-open"); b.removeAttribute("inert"); b.setAttribute("aria-hidden", "false");
    $("#basketBtn").setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked"); lenis?.stop();
    setTimeout(() => $("#basketClose").focus(), 50);
  }
  function closeBasket() {
    const b = $("#basket"), s = $("#scrim");
    s.classList.remove("is-on"); setTimeout(() => { s.hidden = true; }, 350);
    b.classList.remove("is-open"); b.setAttribute("inert", ""); b.setAttribute("aria-hidden", "true");
    $("#basketBtn").setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked"); lenis?.start();
    lastFocus?.focus();
  }

  function bindBasket() {
    $("#basketBtn").addEventListener("click", openBasket);
    $("#basketClose").addEventListener("click", closeBasket);
    $("#scrim").addEventListener("click", closeBasket);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#basket").classList.contains("is-open")) closeBasket(); });
    document.addEventListener("click", (e) => {
      const q = e.target.closest("[data-qty]");
      if (q) step(q.dataset.qty, parseInt(q.dataset.d, 10));
    });
    $("#basketForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const keys = Object.keys(state.basket).filter((k) => itemFor(k));
      if (!keys.length) { toast(t().needItems); return; }
      const b = D.BRANCHES.find((x) => x.id === $("#branchSelect").value);
      const lines = [t().msgHead, ...keys.map((k) => `- ${name(itemFor(k).obj)}: ${fmtQty(k, state.basket[k])}`), "",
        `${t().msgBranch}: ${name(b)} (${L(b, "area").split(/[.،]/)[0]})`,
        `${t().msgName}: ${$("#custName").value.trim()}`];
      const note = $("#custNote").value.trim();
      if (note) lines.push(`${t().msgNote}: ${note}`);
      wa(lines.join("\n"));
    });
  }

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  function initScroll() {
    if (window.Lenis && !reduceMotion) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      if (hasGsap) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    }
    // same-page anchors
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      let target = id === "#top" ? document.body : (id.length > 1 ? $(id) : null);
      if (!target) return;
      e.preventDefault();
      const pinned = target.parentElement?.classList.contains("pin-spacer");
      if (pinned) target = target.parentElement;
      if (lenis) lenis.scrollTo(target, { offset: id === "#top" || pinned ? 0 : -80, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    // arriving with a hash from another page
    if (location.hash && location.hash.length > 1) {
      const target = $(location.hash);
      if (target) setTimeout(() => lenis ? lenis.scrollTo(target, { offset: -80, immediate: true }) : target.scrollIntoView(), 60);
    }
  }

  /* ---------- header ---------- */
  function initHeader() {
    const bar = $("#bar");
    if (document.body.classList.contains("page--sub")) { bar.classList.add("is-solid"); return; }
    const onScroll = () => bar.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.85);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- page transitions (gold curtain between pages) ---------- */
  function initTransitions() {
    const curtain = document.createElement("div");
    curtain.className = "curtain";
    curtain.setAttribute("aria-hidden", "true");
    curtain.innerHTML = '<img src="assets/mark.svg" alt="">';
    document.body.appendChild(curtain);

    let arriving = false;
    try { arriving = sessionStorage.getItem("taj.nav") === "1"; sessionStorage.removeItem("taj.nav"); } catch { /* ignore */ }
    if (arriving && !reduceMotion) {
      curtain.classList.add("is-covering");
      requestAnimationFrame(() => requestAnimationFrame(() => { curtain.classList.remove("is-covering"); curtain.classList.add("is-leaving"); }));
      setTimeout(() => curtain.classList.remove("is-leaving"), 900);
    }

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      const page = (p) => p.replace(/\/index\.html$/, "/");
      if (page(url.pathname) === page(location.pathname)) {
        if (!url.hash) { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); }
        return; // same page: hash links are handled by the scroll handler
      }
      if (reduceMotion) return;
      e.preventDefault();
      try { sessionStorage.setItem("taj.nav", "1"); } catch { /* ignore */ }
      curtain.classList.add("is-entering");
      setTimeout(() => { location.href = url.href; }, 520);
    });
    // restore state when coming back via the back button (bfcache)
    window.addEventListener("pageshow", (e) => { if (e.persisted) curtain.className = "curtain"; });
  }

  /* ---------- boot ---------- */
  function boot() {
    injectChrome();
    captureArabic();
    bindBasket();
    initScroll();
    initHeader();
    initTransitions();
    $("#langBtn").addEventListener("click", () => {
      state.lang = state.lang === "ar" ? "en" : "ar";
      store.set("taj.lang", state.lang);
      applyLang();
    });
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  }
  boot();

  return {
    D, $, $$, esc, reduceMotion, hasGsap, store, state, t, L, name, desc, num,
    get lenis() { return lenis; },
    applyLang, onLang, onBasket, add, inBasket, openBasket, toast, wa,
  };
})();
