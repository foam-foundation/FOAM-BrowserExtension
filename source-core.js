/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Where a property or action was declared, from the file FOAM stamps on each
// axiom. foam.CLASS records the loading script's URL on the model
// (EndBoot.js:303) and the model copies it onto every axiom it installs
// (Boot.js:273), refinements included. installAxioms also records the class
// the axiom went into as sourceCls_ (FObject.js:159) — debug.js:159-173
// describe() prints the same two columns. Together they separate three
// cases: the class's own field (its file), a refinement (the owner is the
// class, the file is not the owner's model_.source — Boot.js:126-132 mutates
// the target, it never swaps its model), and an inherited field (the owner
// is a parent class). Pure and dual-exported so each rule has a Node test.
(function(exports) {
  function pathOf(url) {
    var s = String(url).replace(/[?#].*$/, '');
    var m = /^[a-z][a-z0-9+.-]*:\/\/[^\/]*(\/.*)$/i.exec(s);
    return ( m ? m[1] : s ).replace(/^\/+/, '');
  }

  // { url, path, file, refined, from } for an axiom's source URL, or null
  // when there is nothing honest to show: no stamp, or a bundled page, where
  // foam.js:63 maps every class to one /foam-bin*.js file. owner is
  // { id, file }: the axiom's sourceCls_ and that class's own model_.source.
  // from is the owner's id when it is not the class on screen (viewedId).
  exports.declaredIn = function(axiomUrl, owner, viewedId) {
    if ( ! axiomUrl ) return null;
    var path = pathOf(axiomUrl);
    if ( /(^|\/)foam-bin[^\/]*\.js$/.test(path) ) return null;
    return {
      url: axiomUrl,
      path: path,
      file: path.slice(path.lastIndexOf('/') + 1),
      refined: !! ( owner && owner.file ) && pathOf(owner.file) !== path,
      from: ( owner && owner.id && viewedId && owner.id !== viewedId ) ? owner.id : null
    };
  };

  // The "declared in" cell text: the file name, flagged when a refinement
  // rather than the owner's own file declared or last changed the axiom, and
  // when the owner is a parent class rather than the one on screen.
  exports.label = function(decl) {
    if ( ! decl ) return '';
    var notes = [];
    if ( decl.refined ) notes.push('refinement');
    if ( decl.from ) notes.push('inherited from ' + decl.from.slice(decl.from.lastIndexOf('.') + 1));
    return decl.file + ( notes.length ? ' (' + notes.join(', ') + ')' : '' );
  };

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // The 0-based line that declares `name` in a FOAM source file, or -1: an
  // axiom written as { name: 'x' } (any quote) or a method written as
  // function x(. A text search, not a parse: a miss only means the link opens
  // at the top of the right file.
  exports.declLine = function(text, name) {
    if ( ! text || ! name ) return -1;
    var n = escapeRe(name);
    var re = new RegExp('\\bname\\s*:\\s*([\'"`])' + n + '\\1|\\bfunction\\s+' + n + '\\s*\\(');
    var lines = String(text).split('\n');
    for ( var i = 0 ; i < lines.length ; i++ ) if ( re.test(lines[i]) ) return i;
    return -1;
  };
})(typeof module !== 'undefined' ? module.exports : ( window.__foamSourceCore = {} ));
