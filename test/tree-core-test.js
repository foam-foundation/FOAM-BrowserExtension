/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var assert = require('assert');
var T = require('../tree-core.js');
var passes = 0;
function t(cond, msg) { assert(cond, msg); passes++; console.log('  ok', msg); }

var WRAP = { 'foam.u2.Element': 1, 'foam.u2.SlotNode': 1, 'foam.u2.Text': 1 };
function N(uid, cls, kids, extra) {
  var layer = { cls: cls, dao: null, data: null, view: null, prop: null, modes: null };
  Object.assign(layer, ( extra && extra.layer ) || {});
  return { uid: uid, layer: layer, shown: extra && extra.shown === false ? false : true, wrapper: !! WRAP[cls], kids: kids || [] };
}
//  1 Root
//  ├─ 2 DetailView (User #1)
//  │   ├─ 3 PropertyBorder (prop email)
//  │   │   └─ 4 TextField
//  │   └─ 5 Element (hidden)
//  └─ 6 Footer
var tree = { root: N(1, 'com.x.Root', [
  N(2, 'foam.u2.detail.DetailView', [
    N(3, 'foam.u2.PropertyBorder', [ N(4, 'foam.u2.TextField') ], { layer: { prop: 'email' } }),
    N(5, 'foam.u2.Element', [], { shown: false })
  ], { layer: { data: { cls: 'com.x.User', id: '1', summary: null } } }),
  N(6, 'com.x.Footer')
]), count: 6, truncated: false };

var all = T.flatten(tree, new Set([ 1, 2, 3 ]));
t(all.map(function(r) { return r.uid; }).join(',') === '1,2,3,4,5,6', 'flatten: pre-order');
t(all.map(function(r) { return r.depth; }).join(',') === '0,1,2,3,2,1', 'flatten: depth per row');
t(all[0].cls === 'Root' && all[1].binding === 'User #1' && all[2].binding === 'prop email', 'flatten: short class + binding');
t(all[1].hasKids === true && all[1].open === true && all[3].hasKids === false && all[5].open === false, 'flatten: hasKids / open flags');
t(all[4].shown === false && all[0].shown === true, 'flatten: shown carried');
t(all[4].wrapper === true && all[0].wrapper === false, 'flatten: wrapper carried, so shown wrappers can be marked');
var some = T.flatten(tree, new Set([ 1 ]));
t(some.map(function(r) { return r.uid; }).join(',') === '1,2,6', 'flatten: collapsed subtree skipped');
t(T.flatten(tree, new Set()).length === 1, 'flatten: collapsed root -> root row only');
t(T.flatten({ root: null }, new Set()).length === 0 && T.flatten(null, new Set()).length === 0, 'flatten: no root -> []');

t(T.pathTo(tree, 4).join(',') === '1,2,3,4', 'pathTo: root-first path');
t(T.pathTo(tree, 99).length === 0 && T.pathTo(tree, null).length === 0, 'pathTo: miss / null -> []');

var d0 = T.defaultExpanded(tree, null);
t(d0.has(1) && d0.has(2) && d0.has(3) && d0.has(6) && d0.has(4), 'defaultExpanded: depth 0-2 open; 4 opens as the only child of 3');
var wide = { root: N(1, 'a', [ N(2, 'b', [ N(3, 'c', [ N(4, 'd'), N(9, 'd2') ]) ]) ]) };
t(T.defaultExpanded(wide, null).has(3) && ! T.defaultExpanded(wide, null).has(4), 'defaultExpanded: a branch at depth 3 stays closed');
var chain = { root: N(1, 'a', [ N(2, 'b', [ N(3, 'c', [ N(4, 'd', [ N(5, 'e', [ N(6, 'f'), N(7, 'g') ]) ]) ]) ]) ]) };
t(T.defaultExpanded(chain, null).has(5) && ! T.defaultExpanded(chain, null).has(6), 'defaultExpanded: only-child chain opens down to the first branch');
var d1 = T.defaultExpanded(wide, 9);
t(d1.has(3) && ! d1.has(9), 'defaultExpanded: ancestors of the selected node open, not the node');

// hide wrappers: 5 (Element) vanishes; a wrapper with view children lifts them
var wt = { root: N(1, 'com.x.Root', [ N(2, 'foam.u2.Element', [ N(3, 'foam.u2.SlotNode', [ N(4, 'com.x.View') ]), N(5, 'foam.u2.Text') ]), N(6, 'com.x.Leaf') ]) };
var hidden = T.flatten(wt, new Set([ 1, 4 ]), { hideWrappers: true });
t(hidden.map(function(r) { return r.uid + '@' + r.depth; }).join(',') === '1@0,4@1,6@1', 'flatten hideWrappers: wrapper rows gone, children at the wrapper depth, open state of wrappers ignored');
t(hidden[0].hasKids === true && hidden[1].hasKids === false, 'flatten hideWrappers: hasKids counts only rows that would show');
t(T.flatten({ root: N(1, 'foam.u2.Element', [ N(2, 'com.x.V') ]) }, new Set([ 1 ]), { hideWrappers: true }).length === 2, 'flatten hideWrappers: root wrapper still shown');
var onlyWrap = T.flatten({ root: N(1, 'com.x.Root', [ N(2, 'foam.u2.Element', [ N(3, 'foam.u2.Text') ]) ]) }, new Set([ 1 ]), { hideWrappers: true });
t(onlyWrap.length === 1 && onlyWrap[0].hasKids === false, 'flatten hideWrappers: wrapper-only subtree -> no toggle');

t(T.allOpen(tree, new Set([ 1, 2, 3 ])) === true && T.allOpen(tree, new Set([ 1, 2 ])) === false, 'allOpen: one collapsed toggle on screen -> false');
t(T.allOpen(tree, new Set([ 1 ])) === false && T.allOpen(tree, new Set()) === false, 'allOpen: collapsed root -> false');
t(T.allOpen(wt, new Set([ 1, 4 ]), { hideWrappers: true }) === true, 'allOpen: hidden wrappers do not count');
t(T.allOpen(null, new Set()) === true, 'allOpen: no tree -> vacuously true');

t(T.subtreeUids(tree, 2).join(',') === '2,3,4,5', 'subtreeUids: node and everything below');
t(T.subtreeUids(tree, 42).length === 0, 'subtreeUids: miss -> []');

var pruned = T.pruneExpanded(new Set([ 1, 2, 42 ]), tree);
t(pruned.size === 2 && pruned.has(1) && pruned.has(2) && ! pruned.has(42), 'pruneExpanded: uids gone from the tree dropped');
t(T.pruneExpanded(new Set([ 1 ]), null).size === 0, 'pruneExpanded: no tree -> empty');

t(T.shownUid(wt, 4, { hideWrappers: true }) === 4 && T.shownUid(wt, 4) === 4, 'shownUid: a view row is its own row');
t(T.shownUid(wt, 3, { hideWrappers: true }) === 1 && T.shownUid(wt, 5, { hideWrappers: true }) === 1, 'shownUid: hidden wrapper -> nearest ancestor with a row');
t(T.shownUid(wt, 3) === 3, 'shownUid: wrappers shown -> the wrapper itself');
t(T.shownUid(wt, 99, { hideWrappers: true }) === null && T.shownUid(wt, null) === null, 'shownUid: miss / null -> null');
t(T.shownUid({ root: N(1, 'foam.u2.Element', [ N(2, 'foam.u2.Text') ]) }, 2, { hideWrappers: true }) === 1, 'shownUid: wrapper root is still a row');
var deep = { root: N(1, 'com.x.Root', [ N(2, 'com.x.View', [ N(3, 'foam.u2.Element', [ N(4, 'foam.u2.Text') ]) ]) ]) };
t(T.shownUid(deep, 4, { hideWrappers: true }) === 2, 'shownUid: nearest non-wrapper ancestor, not the root');
t(T.shownUid(null, 4) === null && T.shownUid({ root: null }, 4) === null, 'shownUid: no tree -> null');
t(T.allOpen(wt, new Set([ 1 ]), { hideWrappers: true }) === true, 'allOpen: closed nodes that are hidden wrappers do not count');
var deepRows = T.flatten(deep, T.defaultExpanded(deep, 4), { hideWrappers: true }).map(function(r) { return r.uid; });
t(deepRows.indexOf(4) < 0 && deepRows.indexOf(T.shownUid(deep, 4, { hideWrappers: true })) >= 0, 'flatten + shownUid: the wrapper gets no row, its stand-in does');

var eff = T.effectiveExpanded(tree, null, new Set([ 4 ]), new Set([ 2 ]));
t(eff.has(1) && eff.has(6) && eff.has(4) && ! eff.has(2), 'effectiveExpanded: defaults + opened - closed');
var late = { root: N(1, 'a', [ N(2, 'b', [ N(7, 'late', [ N(8, 'kid') ]) ]) ]) };
t(T.effectiveExpanded(late, null, new Set(), new Set()).has(7), 'effectiveExpanded: a node that appeared after the first poll starts open');
t(! T.effectiveExpanded(tree, 4, new Set(), new Set([ 2 ])).has(2), 'effectiveExpanded: a closed ancestor of the selection stays closed (the panel reopens the path on a new selection)');

// App tree (#5536): rooted at ctrl, so the current screen sits deep and
// hidden views (shown: false) sit beside it.
//  1 App
//  ├─ 2 NavBar ─ 3 Menu
//  └─ 4 StackView
//      ├─ 5 Hidden (shown: false) ─ 6 Inner
//      └─ 7 Wrap
//          ├─ 8 Side
//          └─ 9 Current screen
//              └─ 10 Detail
//                  ├─ 11 Border ─ 12 Field, 14 Hint
//                  └─ 13 Border
var app = { root: N(1, 'com.x.App', [
  N(2, 'com.x.NavBar', [ N(3, 'com.x.Menu') ]),
  N(4, 'foam.u2.stack.StackView', [
    N(5, 'com.x.Hidden', [ N(6, 'com.x.Inner') ], { shown: false }),
    N(7, 'com.x.Wrap', [ N(8, 'com.x.Side'), N(9, 'com.x.Screen', [
      N(10, 'foam.u2.detail.DetailView', [ N(11, 'foam.u2.PropertyBorder', [ N(12, 'foam.u2.TextField'), N(14, 'foam.u2.Hint') ]), N(13, 'foam.u2.PropertyBorder') ])
    ]) ])
  ])
]) };
var da = T.defaultExpanded(app, null, 9);
t(! da.has(5), 'defaultExpanded: a hidden view (shown: false) starts folded, even within the first two levels');
t(da.has(1) && da.has(4) && da.has(7) && da.has(9), 'defaultExpanded: every ancestor of the current screen opens, however deep');
t(da.has(10) && da.has(11) && ! da.has(12), 'defaultExpanded: below the current screen the same two-level rule applies as from the root');
t(da.has(2), 'defaultExpanded: the app chrome beside the screen (nav bar) still opens from the root rule');
t(! T.defaultExpanded(app, null, null).has(9), 'defaultExpanded: without a current screen, depth past two stays closed');
var rowsA = T.flatten(app, da, { currentUid: 9 });
t(rowsA.filter(function(r) { return r.current; }).map(function(r) { return r.uid; }).join() === '9', 'flatten: the current screen row is marked, and only it');
t(T.effectiveExpanded(app, null, new Set(), new Set(), 9).has(9), 'effectiveExpanded: passes the current screen through to the defaults');

// The current screen can fall past the node cap (tree() walks from ctrl,
// nav and menus first): the panel must say so instead of showing no screen.
t(T.currentMissing(app, 9) === false, 'currentMissing: false when the current screen is in the tree');
t(T.currentMissing(app, 99) === true, 'currentMissing: true when the stack has a current view the walk never reached');
t(T.currentMissing(app, null) === false && T.currentMissing(null, 9) === false, 'currentMissing: false with no current view or no tree');

console.log('tree-core-test:', passes, 'passed');
