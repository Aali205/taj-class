"""Keeps the shared header, mobile tab bar and footer identical across pages.

Each page marks the spots with <!-- partial:NAME --> ... <!-- /partial:NAME -->.
Run from the project root after editing a partial:  python tools/sync-partials.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {"index.html": "home", "sweets.html": "sweets", "gifts.html": "gifts", "branches.html": "branches"}

NAV = [
    ("sweets", "sweets.html", "nav.sweets", "الأصناف"),
    ("gifts", "gifts.html", "nav.gifts", "الضيافة والهدايا"),
    ("branches", "branches.html", "nav.branches", "الفروع"),
]

TAB_ICONS = {
    "home": '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"/>',
    "sweets": '<path d="M4 15c0-4 3.6-7 8-7s8 3 8 7Z"/><path d="M3 15h18M12 8V5"/><circle cx="12" cy="4" r="1"/>',
    "gifts": '<path d="M4 10h16v10H4ZM3 7h18v3H3ZM12 7v13"/><path d="M12 7C10 3 7 4 8 6.5 8.6 7 12 7 12 7ZM12 7c2-4 5-3 4-.5-.6.5-4 .5-4 .5Z"/>',
    "branches": '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/>',
}


def cur(page, key):
    return ' aria-current="page"' if page == key else ""


def header(page):
    links = "\n".join(
        f'    <a href="{href}" data-i18n="{k}"{cur(page, key)}>{ar}</a>' for key, href, k, ar in NAV
    )
    return f"""<header class="bar" id="bar">
  <a class="bar__logo" href="index.html" aria-label="تاج كلاس، الصفحة الرئيسية" data-i18n-label="nav.homeLabel">
    <img src="assets/logo.svg" alt="" width="84" height="106">
  </a>
  <nav class="bar__nav" aria-label="الأقسام" data-i18n-label="nav.label">
{links}
  </nav>
  <div class="bar__tools">
    <button class="lang" id="langBtn" type="button" aria-label="English">EN</button>
    <button class="basket-btn" id="basketBtn" type="button" aria-controls="basket" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.4 10.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 9Z"/><path d="M8.5 9 12 3.5 15.5 9"/></svg>
      <span data-i18n="basket">طلبيتك</span>
      <b class="basket-btn__count" id="basketCount">0</b>
    </button>
  </div>
</header>"""


def tabbar(page):
    items = [("home", "index.html", "nav.home", "الرئيسية")] + NAV
    links = "\n".join(
        f'  <a href="{href}"{cur(page, key)}><svg viewBox="0 0 24 24" aria-hidden="true">{TAB_ICONS[key]}</svg><span data-i18n="{k}">{ar}</span></a>'
        for key, href, k, ar in items
    )
    return f"""<nav class="tabbar" aria-label="التنقل" data-i18n-label="nav.label">
{links}
</nav>"""


def footer(_page):
    return """<footer class="foot">
  <img class="foot__logo" src="assets/logo.svg" alt="تاج كلاس" width="120" height="150" loading="lazy">
  <p class="foot__line" data-i18n="foot.line">للحلويات الشرقية الفاخرة</p>
  <ul class="foot__links">
    <li><a href="sweets.html" data-i18n="nav.sweets">الأصناف</a></li>
    <li><a href="gifts.html" data-i18n="nav.gifts">الضيافة والهدايا</a></li>
    <li><a href="branches.html" data-i18n="nav.branches">الفروع</a></li>
  </ul>
  <ul class="foot__links foot__links--social">
    <li><a href="https://www.instagram.com/tajclaas/" target="_blank" rel="noopener">Instagram</a></li>
    <li><a href="https://www.youtube.com/@tajclass12" target="_blank" rel="noopener">YouTube</a></li>
    <li><a href="https://wa.me/963965875990" target="_blank" rel="noopener">WhatsApp</a></li>
  </ul>
  <p class="foot__small">© <span id="year"></span> <span data-i18n="foot.rights">تاج كلاس. كل الحقوق محفوظة.</span></p>
</footer>"""


PARTIALS = {"header": header, "tabbar": tabbar, "footer": footer}

for file, page in PAGES.items():
    path = ROOT / file
    if not path.exists():
        continue
    html = path.read_text(encoding="utf-8")
    for name, fn in PARTIALS.items():
        pattern = re.compile(rf"(<!-- partial:{name} -->).*?(<!-- /partial:{name} -->)", re.S)
        html, n = pattern.subn(lambda m: m.group(1) + "\n" + fn(page) + "\n" + m.group(2), html)
        if not n:
            print(f"  {file}: no marker for {name}")
    path.write_text(html, encoding="utf-8")
    print(f"synced {file}")
