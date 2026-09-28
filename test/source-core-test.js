/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var assert = require('assert');
var C = require('../source-core.js');
var passes = 0;
function t(cond, msg) { assert(cond, msg); passes++; console.log('  ok', msg); }

var BASE = 'http://localhost:8080/foam3/src/foam/core/auth/User.js';
var REF  = 'http://localhost:8080/app/src/com/acme/UserRefinement.js';

var d = C.declaredIn(BASE, BASE);
t(d && d.path === 'foam3/src/foam/core/auth/User.js', 'declaredIn: path is the URL path without the leading slash');
t(d && d.file === 'User.js', 'declaredIn: file is the last path segment');
t(d && d.url === BASE, 'declaredIn: keeps the full URL for the Sources panel');
t(d && d.refined === false, 'declaredIn: same file as the class is not a refinement');

var r = C.declaredIn(REF, BASE);
t(r && r.refined === true && r.file === 'UserRefinement.js', 'declaredIn: a different file than the class is a refinement');
t(C.declaredIn(REF, null).refined === false, 'declaredIn: unknown class file never claims a refinement');
t(C.declaredIn(BASE + '?v=3#x', BASE).path === 'foam3/src/foam/core/auth/User.js' &&
  C.declaredIn(BASE + '?v=3', BASE).refined === false, 'declaredIn: query and hash are not part of the file');

t(C.declaredIn('http://localhost:8080/foam-bin.js', null) === null, 'declaredIn: a bundled page names one file for every class, so nothing is shown');
t(C.declaredIn('http://localhost:8080/foam-bin-3.28.1.js', null) === null, 'declaredIn: versioned bundle is hidden too');
t(C.declaredIn(undefined, BASE) === null && C.declaredIn('', BASE) === null, 'declaredIn: no source stamp, nothing shown');

var src = [
  "foam.CLASS({",
  "  package: 'foam.core.auth',",
  "  name: 'User',",
  "  properties: [",
  "    { name: 'salaryBand' },",
  "    {",
  "      class: 'Long',",
  "      name: \"salary\",",
  "      visibility: function() { return this.salaryBand ? 'RO' : 'HIDDEN'; }",
  "    },",
  "    { name: `email` }",
  "  ],",
  "  methods: [",
  "    function toSummary() { return this.salary; }",
  "  ]",
  "});"
].join('\n');
t(C.declLine(src, 'salary') === 7, 'declLine: finds name: "salary", not the salaryBand line above it');
t(C.declLine(src, 'salaryBand') === 4, 'declLine: single-quoted name');
t(C.declLine(src, 'email') === 10, 'declLine: backtick-quoted name');
t(C.declLine(src, 'toSummary') === 13, 'declLine: a method declared as function name(');
t(C.declLine(src, 'User') === 2, 'declLine: the class name line itself');
t(C.declLine(src, 'missing') === -1, 'declLine: -1 when the name is not declared');
t(C.declLine('', 'salary') === -1 && C.declLine(null, 'salary') === -1, 'declLine: -1 on empty or missing text');
t(C.declLine("{ name: 'a.b' }", 'a.b') === 0 && C.declLine("{ name: 'aXb' }", 'a.b') === -1, 'declLine: the name is matched literally, not as a pattern');

t(C.label(C.declaredIn(BASE, BASE)) === 'User.js', 'label: base file shows its name');
t(C.label(C.declaredIn(REF, BASE)) === 'UserRefinement.js (refinement)', 'label: a refinement file says so');
t(C.label(null) === '', 'label: nothing to show is an empty cell');

console.log('source-core-test:', passes, 'passed');
