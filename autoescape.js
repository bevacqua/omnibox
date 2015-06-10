'use strict';

var characters = ['<', '>', '"', '`', ' ', '\r', '\n', '\t', '{', '}', '|', '\\', '^', '`', '\''];
var map = [];
var i;
var ch;
var esc;
var len;
for (i = 0, len = characters.length; i < len; ++i) {
  ch = characters[i];
  esc = encodeURIComponent(ch);
  if (esc === ch) {
    esc = global.escape(ch);
  }
  map[ch.charCodeAt(0)] = esc;
}

module.exports = map;
