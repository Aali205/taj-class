/* Taj Class — sweets catalog: search, filters, sort, detail sheet */
(() => {
  "use strict";
  const T = window.Taj, D = T.D, { $, $$, esc } = T;
  const canFlip = T.hasGsap && !!window.Flip && !T.reduceMotion;

  /* ---------- Arabic-aware search ---------- */
  const norm = (s) => String(s).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // harakat, tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

  const catOf = (id) => D.CATEGORIES.find((c) => c.id === id);
  const tagOf = (id) => D.TAGS.find((t) => t.id === id);
  const haystack = {};
  D.PRODUCTS.forEach((p) => {
    haystack[p.id] = norm([p.ar, p.en, p.dar, p.den, catOf(p.cat).ar, catOf(p.cat).en, ...p.tags.flatMap((t) => [tagOf(t).ar, tagOf(t).en])].join(" "));
  });

  /* ---------- state (mirrored in the URL so filtered views can be shared) ---------- */
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    cat: catOf(params.get("cat")) ? params.get("cat") : "all",
    tags: new Set((params.get("tags") || "").split(",").filter((t) => tagOf(t))),
    sort: params.get("sort") === "az" ? "az" : "default",
  };
  function syncUrl(item) {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.cat !== "all") p.set("cat", state.cat);
    if (state.tags.size) p.set("tags", [...state.tags].join(","));
    if (state.sort !== "default") p.set("sort", state.sort);
    if (item) p.set("item", item);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  const matches = (p) => {
    if (state.cat !== "all" && p.cat !== state.cat) return false;
    for (const t of state.tags) if (!p.tags.includes(t)) return false;
    if (state.q) {
      const words = norm(state.q).split(" ").filter(Boolean);
      return words.every((w) => haystack[p.id].includes(w));
    }
    return true;
  };
  const ordered = () => {
    const list = [...D.PRODUCTS];
    if (state.sort === "az") list.sort((a, b) => T.name(a).localeCompare(T.name(b), T.state.lang));
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  };

  /* ---------- rendering ---------- */
  const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function cardHTML(p) {
    const n = esc(T.name(p)), on = T.inBasket("p:" + p.id);
    const media = p.note
      ? `<span class="pcard__img pcard__img--note"><span>${n}</span></span>`
      : `<span class="pcard__img"><img src="assets/img/${p.img}.webp" alt="" loading="lazy" width="640" height="1136"></span>`;
    return `
      <button class="pcard__open" type="button" data-open="${p.id}" aria-haspopup="dialog">${media}
        <span class="pcard__cat">${esc(T.name(catOf(p.cat)))}</span>
        <span class="pcard__name">${n}</span>
      </button>
      <p class="pcard__desc">${esc(T.desc(p))}</p>
      <div class="pcard__foot">
        <span class="pcard__tags">${p.tags.map((t) => esc(T.name(tagOf(t)))).join("، ")}</span>
        <button class="pcard__add${on ? " is-added" : ""}" type="button" data-add="${p.id}" aria-label="${esc(on ? T.t().added : T.t().add)}: ${n}" title="${esc(on ? T.t().added : T.t().add)}">${on ? check : plus}</button>
      </div>`;
  }

  const grid = $("#grid");
  const cards = {};
  function buildCards() {
    grid.innerHTML = "";
    ordered().forEach((p) => {
      const li = document.createElement("li");
      li.className = "pcard";
      li.dataset.id = p.id;
      li.dataset.flipId = p.id;
      li.innerHTML = cardHTML(p);
      cards[p.id] = li;
      grid.appendChild(li);
    });
  }
  function refreshCardText() { D.PRODUCTS.forEach((p) => { cards[p.id].innerHTML = cardHTML(p); }); }

  function renderChips() {
    const count = (catId) => D.PRODUCTS.filter((p) => catId === "all" || p.cat === catId).length;
    $("#catChips").innerHTML = [{ id: "all", ar: "الكل", en: "All" }, ...D.CATEGORIES].map((c) => `
      <button class="chip${state.cat === c.id ? " is-on" : ""}" type="button" role="radio" aria-checked="${state.cat === c.id}" data-cat="${c.id}">
        ${esc(T.name(c))}<span class="chip__n">${T.num(count(c.id))}</span></button>`).join("");
    $("#tagChips").innerHTML = D.TAGS.map((t) => `
      <button class="chip chip--tag${state.tags.has(t.id) ? " is-on" : ""}" type="button" aria-pressed="${state.tags.has(t.id)}" data-tag="${t.id}">${esc(T.name(t))}</button>`).join("");
  }

  function apply({ animate = true } = {}) {
    const list = ordered();
    const visible = list.filter(matches);
    const flipState = animate && canFlip ? Flip.getState(".pcard") : null;

    list.forEach((p) => {
      const el = cards[p.id];
      grid.appendChild(el); // DOM order follows the sort
      el.classList.toggle("is-hidden", !visible.includes(p));
    });

    if (flipState) {
      Flip.from(flipState, {
        duration: 0.6, ease: "power3.inOut", scale: true, absolute: true, nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, delay: 0.15, ease: "power2.out" }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.35, ease: "power2.in" }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    }

    $("#results").textContent = T.t().results(visible.length);
    const filtered = state.q || state.cat !== "all" || state.tags.size || state.sort !== "default";
    $("#clearAll").hidden = !filtered;
    $("#empty").hidden = visible.length > 0;
    $("#qClear").hidden = !state.q;
    syncUrl(openId);
  }

  /* ---------- controls ---------- */
  const q = $("#q");
  q.value = state.q;
  let qTimer;
  q.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = q.value.trim(); apply(); }, 180);
  });
  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); state.q = q.value.trim(); apply(); q.blur(); });
  $("#qClear").addEventListener("click", () => { q.value = ""; state.q = ""; apply(); q.focus(); });

  $("#catChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-cat]"); if (!c || c.dataset.cat === state.cat) return;
    state.cat = c.dataset.cat; renderChips(); apply();
  });
  $("#catChips").addEventListener("keydown", (e) => { // radio-group arrow keys
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const btns = $$("[data-cat]", $("#catChips")), i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const fwd = (e.key === "ArrowLeft") === (document.documentElement.dir === "rtl");
    const next = btns[(i + (fwd ? 1 : -1) + btns.length) % btns.length];
    next.click(); requestAnimationFrame(() => $(`[data-cat="${next.dataset.cat}"]`).focus());
    e.preventDefault();
  });
  $("#tagChips").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tag]"); if (!t) return;
    state.tags.has(t.dataset.tag) ? state.tags.delete(t.dataset.tag) : state.tags.add(t.dataset.tag);
    renderChips(); apply();
  });
  const sortSel = $("#sortSel");
  sortSel.value = state.sort;
  sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });

  const clearAll = () => {
    state.q = ""; q.value = ""; state.cat = "all"; state.tags.clear(); state.sort = "default"; sortSel.value = "default";
    renderChips(); apply();
  };
  $("#clearAll").addEventListener("click", clearAll);
  $("#emptyClear").addEventListener("click", clearAll);

  /* sticky filter bar picks up a shadow once it's stuck */
  if (T.hasGsap) {
    ScrollTrigger.create({ trigger: "#filters", start: "top top+=72", end: "max", toggleClass: { targets: "#filters", className: "is-stuck" } });
  }

  /* ---------- detail sheet ---------- */
  const sheet = $("#sheet");
  let openId = null, sheetQty = 1;

  function fillSheet(p) {
    const n = T.name(p);
    $("#sheetMedia").innerHTML = p.note
      ? `<div class="sheet__note"><span>${esc(n)}</span></div>`
      : `<img src="assets/img/${p.img}.webp" alt="${esc(n)}" width="640" height="1136">`;
    $("#sheetCat").textContent = T.name(catOf(p.cat));
    $("#sheetName").textContent = n;
    $("#sheetDesc").textContent = T.desc(p);
    $("#sheetTags").innerHTML = p.tags.map((t) => `<li>${esc(T.name(tagOf(t)))}</li>`).join("");
    const only = p.only && D.BRANCHES.find((b) => b.id === p.only);
    $("#sheetOnly").hidden = !only;
    if (only) $("#sheetOnly").textContent = T.t().onlyAt(T.name(only));
    $("#sheetStepper").setAttribute("aria-label", T.t().qty);
    $("#stepLess").setAttribute("aria-label", T.t().less);
    $("#stepMore").setAttribute("aria-label", T.t().more);
    $("#sheetClose").setAttribute("aria-label", T.t().close);
    renderSheetQty();
  }
  function renderSheetQty() {
    $("#sheetQty").textContent = `${T.num(sheetQty)} ${T.t().kg}`;
    $("#stepLess").disabled = sheetQty <= 0.5;
    const on = T.inBasket("p:" + openId);
    $("#sheetAdd").textContent = on ? (T.state.lang === "ar" ? "حدّث الكمية" : "Update quantity") : T.t().addQty;
  }

  function openSheet(id) {
    const p = D.PRODUCTS.find((x) => x.id === id); if (!p) return;
    openId = id;
    sheetQty = T.state.basket["p:" + id] || 1;
    fillSheet(p);
    sheet.showModal();
    T.lenis?.stop();
    if (T.hasGsap && !T.reduceMotion) {
      gsap.fromTo(".sheet__card", { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" });
      gsap.fromTo(".sheet__media > *", { scale: 1.08 }, { scale: 1, duration: 0.9, ease: "power2.out" });
      gsap.fromTo(".sheet__body > *", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, delay: 0.12, ease: "power2.out" });
    }
    syncUrl(id);
  }
  function closeSheet() {
    if (!sheet.open) return;
    const done = () => { sheet.close(); T.lenis?.start(); const back = cards[openId]?.querySelector(".pcard__open"); openId = null; syncUrl(); back?.focus(); };
    if (T.hasGsap && !T.reduceMotion) gsap.to(".sheet__card", { y: 30, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: done });
    else done();
  }

  grid.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const key = "p:" + add.dataset.add;
      if (T.inBasket(key)) T.openBasket(); else T.add(key);
      return;
    }
    const o = e.target.closest("[data-open]");
    if (o) openSheet(o.dataset.open);
  });
  $("#sheetClose").addEventListener("click", closeSheet);
  sheet.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
  $("#sheetStepper").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]"); if (!b) return;
    sheetQty = Math.max(0.5, sheetQty + 0.5 * parseInt(b.dataset.step, 10));
    renderSheetQty();
  });
  $("#sheetAdd").addEventListener("click", () => {
    T.add("p:" + openId, sheetQty);
    closeSheet();
  });

  T.onBasket(() => { refreshCardText(); if (sheet.open) renderSheetQty(); });
  T.onLang(() => {
    renderChips(); refreshCardText(); apply({ animate: false });
    if (sheet.open) fillSheet(D.PRODUCTS.find((x) => x.id === openId));
  });

  /* ---------- boot ---------- */
  buildCards();
  T.applyLang(); // renders chips, cards and counts via onLang
  const startItem = params.get("item");

  if (T.hasGsap && !T.reduceMotion) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".page-title", { yPercent: 30, opacity: 0, duration: 0.9 })
      .from(".page-lede", { y: 16, opacity: 0, duration: 0.7 }, "-=0.6")
      .from(".search", { y: 16, opacity: 0, duration: 0.7 }, "-=0.55")
      .from(".filters .chip", { y: 10, opacity: 0, duration: 0.45, stagger: 0.03 }, "-=0.5")
      .from(".pcard:not(.is-hidden)", { y: 40, opacity: 0, duration: 0.8, stagger: { each: 0.06, grid: "auto" } }, "-=0.4");
    if (startItem) tl.add(() => openSheet(startItem), 0.6);
  } else if (startItem) {
    openSheet(startItem);
  }
})();
