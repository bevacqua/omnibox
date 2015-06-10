'use strict';

var autoescape = require('./autoescape');

function getComponentEscaped (text, start, end) {
  var i = start;
  var current = start;
  var result = '';
  var ch;
  var escaped;
  for (; i <= end; ++i) {
    ch = text.charCodeAt(i);
    escaped = autoescape[ch];
    if (escaped) {
      if (current < i) {
        result += text.slice(current, i);
      }
      result += escaped;
      current = i + 1;
    }
  }
  if (current < i + 1) {
    result += text.slice(current, i);
  }
  return result;
}

module.exports = getComponentEscaped;
