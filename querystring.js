'use strict';

var separator = '&';
var equals = '=';
var plus = '%20';
var maxKeys = 1000;
var isArray = Array.isArray || function isArray (input) {
  return Object.prototype.toString.call(input) === '[object Array]';
};

function hasOwnProperty (input, prop) {
  return Object.prototype.hasOwnProperty.call(input, prop);
}

function parse (qs) {
  var map = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return map;
  }

  var rplus = /\+/g;
  var x;
  var idx;
  var kstr;
  var vstr;
  var k;
  var v;
  var i;
  var parts = qs.split(separator);
  var len = parts.length;
  if (len > maxKeys) {
    len = maxKeys;
  }

  for (i = 0; i < len; i++) {
    x = parts[i].replace(rplus, plus);
    idx = x.indexOf(equals);

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(map, k)) {
      map[k] = v;
    } else if (isArray(map[k])) {
      map[k].push(v);
    } else {
      map[k] = [map[k], v];
    }
  }

  return map;
}

module.exports = {
  parse: parse
};
