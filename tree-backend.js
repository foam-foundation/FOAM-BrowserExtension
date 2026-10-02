/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Registers the Tree tab's methods. Browser-only glue: the walk is
// shapers.treeOf (tested); this adds the uid -> element map of the last
// snapshot, the hand-off to selection-backend.js and the hover overlay.
(function() {
  var D = window.__foamDevtools, P = window.__foamShapers;
  var CAP = 5000;

  // uid -> element for the last snapshot only: a cache of what the panel is
  // looking at, rebuilt on every tree() call, never the selection itself.
  // It pins up to CAP elements (and their records and DAOs) until the next
  // tree() or treeRelease, which the panel sends when it leaves the Tree tab.
  var uidMap = new Map();

  // The whole app, from ctrl down, so the navigation bar, side menu, footer
  // and popups (DesktopStackView adds a popup to ctrl, not to the stack) are
  // in the tree next to the screen. current is the stack's view, which the
  // panel opens and marks; the Why tab keeps using the screen alone.
  D.register('tree', function() {
    if ( ! D.foamReady() ) return { foam: false };
    uidMap = new Map();
    var app = null, screen = D.screenRoot();
    try { app = window.ctrl || null; } catch (e) {}
    var tree = P.treeOf(app || screen, CAP, function(el, uid) { uidMap.set(uid, el); });
    var current = ( screen && screen !== app ) ? screen.$UID : null;
    return { tree: tree, selected: D.selectionUid(), current: current };
  });

  D.register('selectUid', function(uid) {
    var el = uidMap.get(uid);
    if ( ! el ) return { error: 'stale tree — refresh' };
    D.selectNode(el);
    return { ok: true };
  });

  // Hover highlight. Chrome gives extensions no overlay API, so the page
  // draws it: fixed divs over element boxes with a class-name tag, redrawn on
  // every call and removed by highlight(null). The only DOM the extension
  // adds to the page, and it never outlives the hover.
  // The hovered element gets the blue box. Every element bound to it
  // (shapers.boundTo: its ActionViews, other views of the same record) gets
  // a purple box whose tag starts "bound" — the tag, not only the colour,
  // says which is which.
  // The boxes expire by themselves TTL_MS after the last highlight call: the
  // panel repeats the call once a second while a row stays hovered, so a
  // panel that is hidden or torn down ends the outline by going quiet. A uid
  // that no longer resolves (element re-rendered on the page) clears it on
  // the spot below. A panel row re-rendered under the pointer is the panel's
  // to notice (panel.js syncHover): from here that uid still resolves.
  var boxes = [], expiry = null, TTL_MS = 2500;
  var STYLE = {
    primary: { fill: 'rgba(111,168,220,.4)', line: 'rgba(26,115,232,.9)', tag: '#1a73e8' },
    bound:   { fill: 'rgba(179,136,255,.18)', line: 'rgba(123,31,162,.9)', tag: '#7b1fa2' }
  };
  function drawBox(d, text, kind) {
    var st = STYLE[kind], r = d.getBoundingClientRect();
    var b = document.createElement('div');
    b.setAttribute('data-foam-devtools', 'highlight');
    b.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;' +
      'background:' + st.fill + ';outline:1px ' + ( kind === 'bound' ? 'dashed ' : 'solid ' ) + st.line + ';' +
      'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;';
    var tag = document.createElement('span');
    tag.style.cssText = 'position:absolute;left:0;bottom:100%;background:' + st.tag + ';color:#fff;' +
      'font:11px system-ui,sans-serif;padding:1px 4px;border-radius:2px;white-space:nowrap;';
    tag.textContent = text + '  ' + Math.round(r.width) + '×' + Math.round(r.height);
    b.appendChild(tag);
    document.documentElement.appendChild(b);
    boxes.push(b);
  }
  function clearBoxes() { boxes.forEach(function(b) { b.remove(); }); boxes = []; }
  function clearHighlight() {
    clearTimeout(expiry); expiry = null;
    clearBoxes();
  }
  function domOf(el) {
    var d = el && P.own(el, 'element_');
    return ( d && d.nodeType === 1 && d.isConnected ) ? d : null;
  }
  function shortCls(el) { return el.cls_.id.split('.').pop(); }

  // The panel is done with the snapshot: drop the pins and any hover outline.
  D.register('treeRelease', function() {
    uidMap = new Map();
    clearHighlight();
    return { ok: true };
  });

  D.register('highlight', function(uid) {
    var el = ( uid === null || uid === undefined ) ? null : uidMap.get(uid);
    var d = domOf(el);
    if ( ! d ) { clearHighlight(); return { shown: false }; }
    clearBoxes();
    clearTimeout(expiry); expiry = setTimeout(clearHighlight, TTL_MS);
    var bound = P.boundTo(el, Array.from(uidMap.values())), drawn = 0;
    bound.forEach(function(b) {
      var bd = domOf(b);
      if ( bd && bd !== d ) { drawBox(bd, 'bound ' + shortCls(b), 'bound'); drawn++; }
    });
    drawBox(d, shortCls(el), 'primary');   // last, so its tag sits on top
    return { shown: true, bound: drawn };
  });
})();
