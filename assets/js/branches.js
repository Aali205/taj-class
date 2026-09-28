/* Taj Class — branches: shopfront photo + live map for each branch */
(() => {
  "use strict";
  const T = window.Taj, D = T.D, { $, $$, esc } = T;
  const wide = window.matchMedia("(min-width: 961px)");

  const embedUrl = (b) => {
    const q = b.map.ll || b.map.q;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${b.map.ll ? 16 : 14}&hl=${T.state.lang}&output=embed`;
  };
  const dirUrl = (b) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(b.map.ll || b.map.q);

  const pin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  const clock = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  const phone = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.5 4-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/></svg>';

  function photoHTML(b, cls = "") {
    if (b.img) return `<img class="${cls}" src="assets/img/${b.img}.webp" alt="${esc(T.L(b, "imgAlt"))}" loading="lazy">`;
    return `<div class="sign-panel ${cls}" role="img" aria-label="${esc(T.name(b))}">
      <img src="assets/mark.svg" alt="" width="70" height="137">
      <span class="sign-panel__name">${esc(T.name(b))}</span>
      <span class="sign-panel__note">${esc(T.t().photoSoon)}</span></div>`;
  }

  /* ---------- list ---------- */
  function renderList() {
    $("#atlasList").innerHTML = D.BRANCHES.map((b) => {
      const tag = b.hq ? `<span class="branch__tag">${T.t().hq}</span>` : b.fresh ? `<span class="branch__tag">${T.t().fresh}</span>` : "";
      const phones = b.phones.length
        ? b.phones.map(([label, tel]) => `<a href="tel:${tel}">${label}</a>`).join("")
        : `<a href="https://wa.me/${D.WA_NUMBER}" target="_blank" rel="noopener">${T.t().waOnly}</a>`;
      const hours = T.L(b, "hours") || T.t().hoursUnknown;
      return `<li class="stop" id="${b.id}" data-branch="${b.id}">
        <div class="stop__photo">${photoHTML(b)}</div>
        <div class="stop__body">
          <h2 class="stop__name">${esc(T.name(b))}${tag}</h2>
          <p class="stop__row">${pin}<span>${esc(T.L(b, "area"))}</span></p>
          <p class="stop__row">${clock}<span>${esc(hours)}</span></p>
          <div class="stop__row stop__phones">${phone}<span>${phones}</span></div>
          <div class="stop__actions">
            <button class="btn btn--ink stop__show" type="button" data-show="${b.id}" aria-controls="map-${b.id}" aria-expanded="false">${esc(T.t().map)}</button>
            <a class="btn btn--line" href="${dirUrl(b)}" target="_blank" rel="noopener">${esc(T.t().directions)}</a>
          </div>
          <div class="stop__map" id="map-${b.id}" hidden></div>
        </div>
      </li>`;
    }).join("");
  }

  /* ---------- sticky panel (wide screens) ---------- */
  let active = null;
  function setActive(id, { force = false } = {}) {
    if (!wide.matches || (id === active && !force)) return;
    active = id;
    const b = D.BRANCHES.find((x) => x.id === id);
    $$(".stop").forEach((s) => s.classList.toggle("is-active", s.dataset.branch === id));

    const photo = $("#atlasPhoto"), map = $("#atlasMap");
    const swap = () => {
      photo.innerHTML = photoHTML(b, "atlas__img");
      map.innerHTML = `<iframe title="${esc(T.name(b))}" src="${embedUrl(b)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
      $("#atlasCaption").textContent = `${T.name(b)}. ${b.map.ll ? T.t().exact : T.t().area}`;
    };
    if (T.hasGsap && !T.reduceMotion && photo.children.length) {
      gsap.to([photo, map], { opacity: 0, y: 10, duration: 0.25, ease: "power2.in", onComplete: () => {
        swap();
        gsap.fromTo([photo, map], { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" });
        gsap.fromTo(photo.firstElementChild, { scale: 1.08 }, { scale: 1, duration: 1.2, ease: "power2.out" });
      } });
    } else swap();
  }

  let triggers = [];
  let holdUntil = 0; // after arriving on a #branch link, keep that branch until the visitor scrolls themselves
  function bindScroll() {
    triggers.forEach((t) => t.kill()); triggers = [];
    if (!T.hasGsap || !wide.matches) return;
    $$(".stop").forEach((el) => {
      triggers.push(ScrollTrigger.create({
        trigger: el, start: "top center", end: "bottom center",
        onToggle: (self) => { if (self.isActive && Date.now() > holdUntil) setActive(el.dataset.branch); },
      }));
    });
  }

  /* clicking a card on wide screens focuses it in the panel; on phones it reveals its own map */
  $("#atlasList").addEventListener("click", (e) => {
    const show = e.target.closest("[data-show]");
    if (!show) return;
    const id = show.dataset.show, b = D.BRANCHES.find((x) => x.id === id);
    if (wide.matches) {
      setActive(id);
      const el = document.getElementById(id);
      T.lenis ? T.lenis.scrollTo(el, { offset: -100, duration: 1.1 }) : el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const box = $("#map-" + id), open = box.hidden;
    if (open && !box.firstChild) box.innerHTML = `<iframe title="${esc(T.name(b))}" src="${embedUrl(b)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    box.hidden = !open;
    show.setAttribute("aria-expanded", String(open));
    if (open && T.hasGsap && !T.reduceMotion) gsap.fromTo(box, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power3.out", onComplete: () => ScrollTrigger.refresh() });
    else if (T.hasGsap) ScrollTrigger.refresh();
  });

  /* The sticky panel can only stay pinned while the list beside it is tall enough.
     Add room after the last card so it can scroll up level with the panel
     before the panel leaves: the last photo and map stay in view until the end. */
  function padList() {
    const list = $("#atlasList"), panel = $("#atlasPanel"), last = list.lastElementChild;
    if (!wide.matches || !last) { list.style.paddingBottom = ""; return; }
    list.style.paddingBottom = Math.max(0, panel.offsetHeight - last.offsetHeight) + "px";
    if (T.hasGsap) ScrollTrigger.refresh();
  }
  let padTimer;
  window.addEventListener("resize", () => { clearTimeout(padTimer); padTimer = setTimeout(padList, 150); });
  window.addEventListener("load", padList);

  function render() {
    renderList();
    padList();
    bindScroll();
    const start = location.hash.slice(1);
    const linked = D.BRANCHES.some((b) => b.id === start);
    if (linked && !active) holdUntil = Date.now() + 1200;
    setActive(linked ? (active || start) : (active || D.BRANCHES[0].id), { force: true });
  }

  T.onLang(render);
  wide.addEventListener("change", render);
  T.applyLang();

  if (T.hasGsap && !T.reduceMotion) {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".page-head .page-title", { yPercent: 30, opacity: 0, duration: 0.9 })
      .from([".page-head .page-lede", ".page-head .btn"], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.6")
      .from(".stop", { y: 50, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.4")
      .from(".atlas__panel", { opacity: 0, x: () => (document.documentElement.dir === "rtl" ? -40 : 40), duration: 0.9 }, "<0.1");
  }
})();
