/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Where a property or action was declared, from the file FOAM stamps on each
// axiom. foam.CLASS records the loading script's URL on the model
// (EndBoot.js:303) and the model copies it onto every axiom it installs
// (Boot.js:273), refinements included. So a field a refinement hid carries
// the refinement's file, while cls.model_.source keeps naming the base file
// (Boot.js:126-132 mutates the target class, it never swaps its model). Pure
// and dual-exported so each rule has a Node test.
(function(exports) {
  function pathOf(url) {
    var s = String(url).replace(/[?#].*$/, '');
    var m = /^[a-z][a-z0-9+.-]*:\/\/[^\/]*(\/.*)$/i.exec(s);
    return ( m ? m[1] : s ).replace(/^\/+/, '');
  }

  // { url, path, file, refined } for an axiom's source URL, or null when
  // there is nothing honest to show: no stamp, or a bundled page, where
  // foam.js:63 maps every class to one /foam-bin*.js file.
  exports.declaredIn = function(axiomUrl, classUrl) {
    if ( ! axiomUrl ) return null;
    var path = pathOf(axiomUrl);
    if ( /(^|\/)foam-bin[^\/]*\.js$/.test(path) ) return null;
    return {
      url: axiomUrl,
      path: path,
      file: path.slice(path.lastIndexOf('/') + 1),
      refined: !! classUrl && pathOf(classUrl) !== path
    };
  };

  // The "declared in" cell text: the file name, flagged when a refinement
  // (not the class's own file) declared or last changed the axiom.
  exports.label = function(decl) {
    if ( ! decl ) return '';
    return decl.file + ( decl.refined ? ' (refinement)' : '' );
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
