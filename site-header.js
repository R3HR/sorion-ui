/*
 * SORION Kopfzeile, EINE fuer alle Seiten (24.10.2026)
 *
 * Anlass (Nutzer-Feedback): "Wenn man oben die Seiten durchklickt, veraendert sich
 * immer die Breite bzw. Hoehe vom Header. Das Logo springt die ganze Zeit durch die
 * Gegend. Bei Leaderboard fehlt es komplett."
 *
 * Ursache: Jede Seite brachte ihre eigene Kopfzeile mit. Vier Bauarten (Logo mit
 * und ohne Untertitel, verschiedene Schriftgroessen und Abstaende), zwei Seiten
 * ganz ohne Logo, und weil die Kopfzeile INNERHALB des Inhaltsrahmens sass, wanderte
 * das Logo mit dessen Breite mit (640 px auf dem Profil, 1600 px auf dem Markt).
 *
 * Deshalb: Dieses Skript steht als ERSTES Element im <body> jeder Seite, laeuft
 * synchron und setzt die Kopfzeile ausserhalb des Inhaltsrahmens ein, immer gleich
 * breit, gleich hoch, mit denselben Eintraegen. Eigene Klassen mit Praefix "sx-"
 * und keine Tag-Selektoren (header, nav), damit das CSS der Seiten nicht hineinwirkt.
 *
 * Seitenspezifische Knoepfe: Eine Seite kann VOR diesem Skript ein
 * <template id="page-header-actions"> ablegen, dessen Inhalt rechts eingesetzt wird.
 */
(function () {
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (file.indexOf('.') < 0) file = 'index.html';

  var SUB = {
    'index.html': 'Market Intelligence',
    'portfolio.html': 'Portfolio',
    'rewards.html': 'Leaderboards',
    'thresholds.html': 'Thresholds',
    'gameweeks.html': 'Gameweek History',
    'accuracy.html': 'Accuracy',
    'profile.html': 'Account',
    'legal.html': 'Legal & Privacy'
  };

  var NAV = [
    { href: 'index.html',      label: 'Market',       page: 'index.html' },
    { href: 'rewards.html',    label: 'Leaderboards', page: 'rewards.html' },
    { href: 'thresholds.html', label: 'Thresholds',   page: 'thresholds.html' },
    { href: '#',               label: 'Manager Search', action: 'search' },
    { href: 'https://craftlog.pro', label: 'Craft_LOG', external: true }
  ];

  var css = [
    // Platz fuer die Scrollleiste immer freihalten: sonst ruecken Kopfzeile und
    // Navigation um ihre Breite, je nachdem ob eine Seite scrollt oder nicht.
    // scrollbar-width hat in aktuellem Chrome VORRANG vor ::-webkit-scrollbar. Drei
    // Seiten setzten es am html-Element, die uebrigen nicht: 2 px Unterschied.
    'html{scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:rgba(176,96,255,.35) transparent}',
    // Dieselbe Scrollleiste auf allen Seiten: drei Seiten hatten eine eigene mit 8 px,
    // die uebrigen die Standardbreite. Der Unterschied verschob die Navigation um 5 px.
    '::-webkit-scrollbar{width:8px;height:8px}',
    '::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}',
    '::-webkit-scrollbar-thumb{background:#2a2a45;border-radius:4px}',
    '::-webkit-scrollbar-thumb:hover{background:#b060ff}',
    '.sx-head-outer{position:relative;z-index:5;max-width:1600px;margin:0 auto;padding:0 32px;box-sizing:border-box}',
    // Zeilenhoehe fest: sonst erbt die Navigation die der Seite und wird mobil je
    // nach Seite 159 bis 171 px hoch.
    '.sx-head{line-height:1.2;font-size:16px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;',
    '  min-height:96px;padding:20px 0;border-bottom:1px solid #2a2a45;margin-bottom:32px;position:relative;box-sizing:border-box}',
    '.sx-head::after{content:"";position:absolute;bottom:-1px;left:0;height:1px;width:40%;',
    '  background:linear-gradient(90deg,#b060ff,transparent);animation:sx-scan 3s ease-in-out infinite}',
    '@keyframes sx-scan{0%{width:0;opacity:1}50%{width:60%;opacity:.8}100%{width:100%;opacity:0}}',
    '.sx-logo{display:flex;flex-direction:column;justify-content:center;text-decoration:none;line-height:1}',
    '.sx-mark{font-family:"Orbitron",monospace;font-size:38px;font-weight:900;letter-spacing:4px;',
    '  color:#e8e8ff;text-shadow:0 0 20px rgba(176,96,255,.5);white-space:nowrap}',
    '.sx-cur{color:#b060ff;animation:sx-blink 1.2s steps(2) infinite}',
    '@keyframes sx-blink{50%{opacity:0}}',
    '.sx-sub{margin-top:8px;font-family:"Share Tech Mono",monospace;font-size:9px;letter-spacing:.3em;',
    '  text-transform:uppercase;color:#b060ff;opacity:.8;white-space:nowrap}',
    '.sx-nav{display:flex;align-items:center;gap:24px;flex-wrap:wrap}',
    '.sx-link{font-family:"Exo 2",sans-serif;font-size:12px;font-weight:500;letter-spacing:.1em;',
    '  text-transform:uppercase;color:#9090c0;text-decoration:none;padding:12px 6px;margin:-12px -6px;',
    '  background:none;border:0;cursor:pointer;transition:color .2s}',
    '.sx-link:hover{color:#b060ff}',
    '.sx-link.sx-active{color:#e8e8ff}',
    '.sx-support{font-family:"Share Tech Mono",monospace;font-size:12px;letter-spacing:.1em;',
    '  text-transform:uppercase;cursor:pointer;color:#b060ff;background:rgba(176,96,255,.10);',
    '  border:1px solid rgba(176,96,255,.55);border-radius:6px;padding:10px 16px;white-space:nowrap;transition:all .15s}',
    '.sx-support:hover{background:#b060ff;color:#0d0d1a;border-color:#b060ff;',
    '  box-shadow:0 0 18px rgba(176,96,255,.4);transform:translateY(-1px)}',
    '@media (max-width:720px){',
    '  .sx-head-outer{padding:0 14px}',
    '  .sx-head{min-height:64px;padding:14px 0;margin-bottom:22px}',
    '  .sx-mark{font-size:20px;letter-spacing:2px}',
    '  .sx-sub{display:none}',
    '  .sx-nav{gap:14px}',
    '}'
  ].join('\n');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var links = NAV.map(function (n) {
    var cls = 'sx-link' + (n.page === file ? ' sx-active' : '');
    if (n.action === 'search') {
      return '<a class="' + cls + '" href="#" onclick="sxManagerSearch();return false;">' + esc(n.label) + '</a>';
    }
    var ext = n.external ? ' target="_blank" rel="noopener"' : '';
    var cur = n.page === file ? ' aria-current="page"' : '';
    return '<a class="' + cls + '" href="' + n.href + '"' + ext + cur + '>' + esc(n.label) + '</a>';
  }).join('');

  var html =
    '<style id="sx-header-css">' + css + '</style>' +
    '<div class="sx-head-outer"><div class="sx-head" role="banner">' +
      '<a class="sx-logo" href="index.html" aria-label="SORION home">' +
        '<span class="sx-mark">SORION<span class="sx-cur">_</span></span>' +
        '<span class="sx-sub">// ' + esc(SUB[file] || 'Market Intelligence') + '</span>' +
      '</a>' +
      '<div class="sx-nav" role="navigation" aria-label="Main">' +
        links +
        '<span id="sx-actions" style="display:contents"></span>' +
        '<button class="sx-support" type="button" onclick="sxSupport()" title="Support SORION">&#9749; Support</button>' +
        '<a class="sx-link' + (file === 'profile.html' ? ' sx-active' : '') + '" id="btn-profile" href="profile.html">&#9673; Profile</a>' +
      '</div>' +
    '</div></div>';

  var me = document.currentScript;
  if (me) me.insertAdjacentHTML('afterend', html);
  else document.body.insertAdjacentHTML('afterbegin', html);

  // Seitenspezifische Knoepfe (falls die Seite welche mitbringt)
  var tpl = document.getElementById('page-header-actions');
  var slot = document.getElementById('sx-actions');
  if (tpl && slot && tpl.content) slot.appendChild(tpl.content.cloneNode(true));

  // Eigener Manager statt "Profile", sofort aus dem Speicher
  try {
    var own = localStorage.getItem('sorion_own');
    var b = document.getElementById('btn-profile');
    if (own && b) {
      b.textContent = '◉ ' + String(own).toUpperCase();
      b.href = 'portfolio.html?manager=' + encodeURIComponent(own);
    }
  } catch (e) {}

  // Manager Search gibt es als Fenster nur auf Markt und Portfolio. Ueberall sonst
  // auf den Markt wechseln und das Fenster dort oeffnen.
  window.sxManagerSearch = function () {
    if (typeof window.openManagerSearch === 'function') return window.openManagerSearch();
    location.href = 'index.html?search=1';
  };

  // Support-Fenster: support.js nachladen, falls die Seite es nicht hat.
  window.sxSupport = function () {
    if (typeof window.openSupport === 'function') return window.openSupport();
    var s = document.createElement('script');
    s.src = 'support.js';
    s.onload = function () { if (typeof window.openSupport === 'function') window.openSupport(); };
    document.head.appendChild(s);
  };
})();
