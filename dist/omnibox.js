!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.omnibox=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
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

},{"./autoescape":1}],3:[function(require,module,exports){
'use strict';

var querystring = require('./querystring');
var autoescape = require('./autoescape');
var getComponentEscaped = require('./getComponentEscaped');

function parse (input) {
  var start = 0;
  var end = input.length - 1;
  var _protocol;
  var _hostname;
  var _host;
  var _port;
  var _prependSlash;
  var _pathname;
  var _path;
  var _query;
  var _search;
  var _hash;
  var ch;

  while (input.charCodeAt(start) <= 0x20 /*' '*/) { start++; }
  while (input.charCodeAt(end) <= 0x20 /*' '*/) { end--; }

  start = parseProtocol(input, start, end);
  start = parseHost(input, start, end);

  if (start <= end) {
    ch = input.charCodeAt(start);
    if (ch === 0x2F /*'/'*/) {
      parsePath(input, start, end);
    } else if (ch === 0x3F /*'?'*/) {
      parseQuery(input, start, end);
    } else if (ch === 0x23 /*'#'*/) {
      parseHash(input, start, end);
    } else {
      parsePath(input, start, end);
    }
  }

  if (!_pathname) { _pathname = '/'; }
  if (!_query) { _query = ''; }
  if (!_search) { _search = ''; }

  _path = parseFullPath();

  parseQueryString();

  return {
    protocol: _protocol,
    hostname: _hostname,
    host: _host,
    port: _port,
    pathname: _pathname,
    path: _path,
    search: _search,
    hash: _hash,
    query: _query
  };

  function parseProtocol (input, start, end) {
    for (var i = start; i <= end; ++i) {
      if (input.charCodeAt(i) === 0x3A /*':'*/) {
        _protocol = input.slice(start, i).toLowerCase();
        return i + 1;
      }
    }
    return start;
  }

  function parseHost (input, start, end) {
    if (input.charCodeAt(start) !== 0x2F /*'/'*/ ||
        input.charCodeAt(start + 1) !== 0x2F /*'/'*/) {
      return start;
    }

    start += 2; // assume slashes

    var lower = false;
    var hostNameStart = start;
    var hostNameEnd = end;
    var portLength = 0;
    var charsAfterDot = 0;
    var hostname;

    for (var i = start; i <= end; ++i) {
      if (charsAfterDot > 62) {
        _hostname = _host = input.slice(start, i);
        return i;
      }
      var ch = input.charCodeAt(i);
      if (ch === 0x3A /*':'*/) {
        portLength = parsePort(input, i + 1, end) + 1;
        hostNameEnd = i - 1;
        break;
      } else if (ch < 0x61 /*'a'*/) {
        if (ch === 0x2E /*'.'*/) {
          charsAfterDot = -1;
        } else if (0x41 /*'A'*/ <= ch && ch <= 0x5A /*'Z'*/) {
          lower = true;
        } else if (!(ch === 0x2D /*'-'*/ || ch === 0x5F /*'_'*/ || (0x30 /*'0'*/ <= ch && ch <= 0x39 /*'9'*/))) {
          if (ch !== 0x2F /*'/'*/ && ch !== 0x3F /*'?'*/ && ch !== 0x23 /*'#'*/) {
            _prependSlash = true;
          }
          hostNameEnd = i - 1;
          break;
        }
      }
      charsAfterDot++;
    }
    if (hostNameEnd + 1 !== start && hostNameEnd - hostNameStart <= 256) {
      hostname = input.slice(hostNameStart, hostNameEnd + 1);
      if (lower) {
        hostname = hostname.toLowerCase();
      }
      _hostname = hostname;
      _host = _port > 0 ? hostname + ':' + _port : hostname;
    }
    return hostNameEnd + 1 + portLength;
  }

  function parsePort (text, start, end) {
    var port = 0;
    var any = false;

    for (var i = start; i <= end; ++i) {
      var ch = text.charCodeAt(i);
      if (ch >= 0x30 /*'0'*/ && ch <= 0x39 /*'9'*/) {
        port = (10 * port) + (ch - 0x30 /*'0'*/);
        any = true;
      } else {
        break;
      }
    }
    if (port === 0 && !any) {
      return 0;
    }
    _port = port;
    return i - start;
  }

  function parsePath (text, start, end) {
    var pathStart = start;
    var pathEnd = end;
    var escape = false;
    var path;
    var i;
    var ch;
    for (i = start; i <= end; ++i) {
      ch = text.charCodeAt(i);
      if (ch === 0x23 /*'#'*/) {
        parseHash(text, i, end);
        pathEnd = i - 1;
        break;
      } else if (ch === 0x3F /*'?'*/) {
        parseQuery(text, i, end);
        pathEnd = i - 1;
        break;
      } else if (!escape && autoescape[ch]) {
        escape = true;
      }
    }
    if (pathStart > pathEnd) {
      _pathname = '/'; return;
    }
    if (escape) {
      path = getComponentEscaped(text, pathStart, pathEnd);
    } else {
      path = text.slice(pathStart, pathEnd + 1);
    }
    _pathname = _prependSlash ? '/' + path : path;
  }

  function parseQuery (text, start, end) {
    var queryStart = start;
    var queryEnd = end;
    var escape = false;
    var i;
    var ch;
    var query;

    for (i = start; i <= end; ++i) {
      ch = text.charCodeAt(i);
      if (ch === 0x23 /*'#'*/) {
        parseHash(text, i, end);
        queryEnd = i - 1;
        break;
      } else if (!escape && autoescape[ch]) {
        escape = true;
      }
    }
    if (queryStart > queryEnd) {
      _search = ''; return;
    }
    if (escape) {
      query = getComponentEscaped(text, queryStart, queryEnd);
    } else {
      query = text.slice(queryStart, queryEnd + 1);
    }
    _search = query;
  }

  function parseQueryString () {
    var search = _search;
    if (search.charCodeAt(0) === 0x3F /*'?'*/) {
      search = search.slice(1);
    }
    _query = querystring.parse(search);
  }

  function parseHash (text, start, end) {
    if (start > end) {
      _hash = ''; return;
    }
    _hash = getComponentEscaped(text, start, end);
  }

  function parseFullPath () {
    if (_pathname || _search) {
      return _pathname + _search;
    }
    if (!_pathname && _search) {
      return '/' + _search;
    }
    return '';
  }
}

module.exports = {
  parse: parse
};

},{"./autoescape":1,"./getComponentEscaped":2,"./querystring":4}],4:[function(require,module,exports){
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

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhdXRvZXNjYXBlLmpzIiwiZ2V0Q29tcG9uZW50RXNjYXBlZC5qcyIsIm9tbmlib3guanMiLCJxdWVyeXN0cmluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNoYXJhY3RlcnMgPSBbJzwnLCAnPicsICdcIicsICdgJywgJyAnLCAnXFxyJywgJ1xcbicsICdcXHQnLCAneycsICd9JywgJ3wnLCAnXFxcXCcsICdeJywgJ2AnLCAnXFwnJ107XG52YXIgbWFwID0gW107XG52YXIgaTtcbnZhciBjaDtcbnZhciBlc2M7XG52YXIgbGVuO1xuZm9yIChpID0gMCwgbGVuID0gY2hhcmFjdGVycy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBjaCA9IGNoYXJhY3RlcnNbaV07XG4gIGVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChjaCk7XG4gIGlmIChlc2MgPT09IGNoKSB7XG4gICAgZXNjID0gZ2xvYmFsLmVzY2FwZShjaCk7XG4gIH1cbiAgbWFwW2NoLmNoYXJDb2RlQXQoMCldID0gZXNjO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGF1dG9lc2NhcGUgPSByZXF1aXJlKCcuL2F1dG9lc2NhcGUnKTtcblxuZnVuY3Rpb24gZ2V0Q29tcG9uZW50RXNjYXBlZCAodGV4dCwgc3RhcnQsIGVuZCkge1xuICB2YXIgaSA9IHN0YXJ0O1xuICB2YXIgY3VycmVudCA9IHN0YXJ0O1xuICB2YXIgcmVzdWx0ID0gJyc7XG4gIHZhciBjaDtcbiAgdmFyIGVzY2FwZWQ7XG4gIGZvciAoOyBpIDw9IGVuZDsgKytpKSB7XG4gICAgY2ggPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgZXNjYXBlZCA9IGF1dG9lc2NhcGVbY2hdO1xuICAgIGlmIChlc2NhcGVkKSB7XG4gICAgICBpZiAoY3VycmVudCA8IGkpIHtcbiAgICAgICAgcmVzdWx0ICs9IHRleHQuc2xpY2UoY3VycmVudCwgaSk7XG4gICAgICB9XG4gICAgICByZXN1bHQgKz0gZXNjYXBlZDtcbiAgICAgIGN1cnJlbnQgPSBpICsgMTtcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQgPCBpICsgMSkge1xuICAgIHJlc3VsdCArPSB0ZXh0LnNsaWNlKGN1cnJlbnQsIGkpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q29tcG9uZW50RXNjYXBlZDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHF1ZXJ5c3RyaW5nID0gcmVxdWlyZSgnLi9xdWVyeXN0cmluZycpO1xudmFyIGF1dG9lc2NhcGUgPSByZXF1aXJlKCcuL2F1dG9lc2NhcGUnKTtcbnZhciBnZXRDb21wb25lbnRFc2NhcGVkID0gcmVxdWlyZSgnLi9nZXRDb21wb25lbnRFc2NhcGVkJyk7XG5cbmZ1bmN0aW9uIHBhcnNlIChpbnB1dCkge1xuICB2YXIgc3RhcnQgPSAwO1xuICB2YXIgZW5kID0gaW5wdXQubGVuZ3RoIC0gMTtcbiAgdmFyIF9wcm90b2NvbDtcbiAgdmFyIF9ob3N0bmFtZTtcbiAgdmFyIF9ob3N0O1xuICB2YXIgX3BvcnQ7XG4gIHZhciBfcHJlcGVuZFNsYXNoO1xuICB2YXIgX3BhdGhuYW1lO1xuICB2YXIgX3BhdGg7XG4gIHZhciBfcXVlcnk7XG4gIHZhciBfc2VhcmNoO1xuICB2YXIgX2hhc2g7XG4gIHZhciBjaDtcblxuICB3aGlsZSAoaW5wdXQuY2hhckNvZGVBdChzdGFydCkgPD0gMHgyMCAvKicgJyovKSB7IHN0YXJ0Kys7IH1cbiAgd2hpbGUgKGlucHV0LmNoYXJDb2RlQXQoZW5kKSA8PSAweDIwIC8qJyAnKi8pIHsgZW5kLS07IH1cblxuICBzdGFydCA9IHBhcnNlUHJvdG9jb2woaW5wdXQsIHN0YXJ0LCBlbmQpO1xuICBzdGFydCA9IHBhcnNlSG9zdChpbnB1dCwgc3RhcnQsIGVuZCk7XG5cbiAgaWYgKHN0YXJ0IDw9IGVuZCkge1xuICAgIGNoID0gaW5wdXQuY2hhckNvZGVBdChzdGFydCk7XG4gICAgaWYgKGNoID09PSAweDJGIC8qJy8nKi8pIHtcbiAgICAgIHBhcnNlUGF0aChpbnB1dCwgc3RhcnQsIGVuZCk7XG4gICAgfSBlbHNlIGlmIChjaCA9PT0gMHgzRiAvKic/JyovKSB7XG4gICAgICBwYXJzZVF1ZXJ5KGlucHV0LCBzdGFydCwgZW5kKTtcbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDIzIC8qJyMnKi8pIHtcbiAgICAgIHBhcnNlSGFzaChpbnB1dCwgc3RhcnQsIGVuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnNlUGF0aChpbnB1dCwgc3RhcnQsIGVuZCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFfcGF0aG5hbWUpIHsgX3BhdGhuYW1lID0gJy8nOyB9XG4gIGlmICghX3F1ZXJ5KSB7IF9xdWVyeSA9ICcnOyB9XG4gIGlmICghX3NlYXJjaCkgeyBfc2VhcmNoID0gJyc7IH1cblxuICBfcGF0aCA9IHBhcnNlRnVsbFBhdGgoKTtcblxuICBwYXJzZVF1ZXJ5U3RyaW5nKCk7XG5cbiAgcmV0dXJuIHtcbiAgICBwcm90b2NvbDogX3Byb3RvY29sLFxuICAgIGhvc3RuYW1lOiBfaG9zdG5hbWUsXG4gICAgaG9zdDogX2hvc3QsXG4gICAgcG9ydDogX3BvcnQsXG4gICAgcGF0aG5hbWU6IF9wYXRobmFtZSxcbiAgICBwYXRoOiBfcGF0aCxcbiAgICBzZWFyY2g6IF9zZWFyY2gsXG4gICAgaGFzaDogX2hhc2gsXG4gICAgcXVlcnk6IF9xdWVyeVxuICB9O1xuXG4gIGZ1bmN0aW9uIHBhcnNlUHJvdG9jb2wgKGlucHV0LCBzdGFydCwgZW5kKSB7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XG4gICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChpKSA9PT0gMHgzQSAvKic6JyovKSB7XG4gICAgICAgIF9wcm90b2NvbCA9IGlucHV0LnNsaWNlKHN0YXJ0LCBpKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gaSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGFydDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSG9zdCAoaW5wdXQsIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChzdGFydCkgIT09IDB4MkYgLyonLycqLyB8fFxuICAgICAgICBpbnB1dC5jaGFyQ29kZUF0KHN0YXJ0ICsgMSkgIT09IDB4MkYgLyonLycqLykge1xuICAgICAgcmV0dXJuIHN0YXJ0O1xuICAgIH1cblxuICAgIHN0YXJ0ICs9IDI7IC8vIGFzc3VtZSBzbGFzaGVzXG5cbiAgICB2YXIgbG93ZXIgPSBmYWxzZTtcbiAgICB2YXIgaG9zdE5hbWVTdGFydCA9IHN0YXJ0O1xuICAgIHZhciBob3N0TmFtZUVuZCA9IGVuZDtcbiAgICB2YXIgcG9ydExlbmd0aCA9IDA7XG4gICAgdmFyIGNoYXJzQWZ0ZXJEb3QgPSAwO1xuICAgIHZhciBob3N0bmFtZTtcblxuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xuICAgICAgaWYgKGNoYXJzQWZ0ZXJEb3QgPiA2Mikge1xuICAgICAgICBfaG9zdG5hbWUgPSBfaG9zdCA9IGlucHV0LnNsaWNlKHN0YXJ0LCBpKTtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgICB2YXIgY2ggPSBpbnB1dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNoID09PSAweDNBIC8qJzonKi8pIHtcbiAgICAgICAgcG9ydExlbmd0aCA9IHBhcnNlUG9ydChpbnB1dCwgaSArIDEsIGVuZCkgKyAxO1xuICAgICAgICBob3N0TmFtZUVuZCA9IGkgLSAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoY2ggPCAweDYxIC8qJ2EnKi8pIHtcbiAgICAgICAgaWYgKGNoID09PSAweDJFIC8qJy4nKi8pIHtcbiAgICAgICAgICBjaGFyc0FmdGVyRG90ID0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAoMHg0MSAvKidBJyovIDw9IGNoICYmIGNoIDw9IDB4NUEgLyonWicqLykge1xuICAgICAgICAgIGxvd2VyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICghKGNoID09PSAweDJEIC8qJy0nKi8gfHwgY2ggPT09IDB4NUYgLyonXycqLyB8fCAoMHgzMCAvKicwJyovIDw9IGNoICYmIGNoIDw9IDB4MzkgLyonOScqLykpKSB7XG4gICAgICAgICAgaWYgKGNoICE9PSAweDJGIC8qJy8nKi8gJiYgY2ggIT09IDB4M0YgLyonPycqLyAmJiBjaCAhPT0gMHgyMyAvKicjJyovKSB7XG4gICAgICAgICAgICBfcHJlcGVuZFNsYXNoID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaG9zdE5hbWVFbmQgPSBpIC0gMTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2hhcnNBZnRlckRvdCsrO1xuICAgIH1cbiAgICBpZiAoaG9zdE5hbWVFbmQgKyAxICE9PSBzdGFydCAmJiBob3N0TmFtZUVuZCAtIGhvc3ROYW1lU3RhcnQgPD0gMjU2KSB7XG4gICAgICBob3N0bmFtZSA9IGlucHV0LnNsaWNlKGhvc3ROYW1lU3RhcnQsIGhvc3ROYW1lRW5kICsgMSk7XG4gICAgICBpZiAobG93ZXIpIHtcbiAgICAgICAgaG9zdG5hbWUgPSBob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgX2hvc3RuYW1lID0gaG9zdG5hbWU7XG4gICAgICBfaG9zdCA9IF9wb3J0ID4gMCA/IGhvc3RuYW1lICsgJzonICsgX3BvcnQgOiBob3N0bmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGhvc3ROYW1lRW5kICsgMSArIHBvcnRMZW5ndGg7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBvcnQgKHRleHQsIHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgcG9ydCA9IDA7XG4gICAgdmFyIGFueSA9IGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XG4gICAgICB2YXIgY2ggPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY2ggPj0gMHgzMCAvKicwJyovICYmIGNoIDw9IDB4MzkgLyonOScqLykge1xuICAgICAgICBwb3J0ID0gKDEwICogcG9ydCkgKyAoY2ggLSAweDMwIC8qJzAnKi8pO1xuICAgICAgICBhbnkgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChwb3J0ID09PSAwICYmICFhbnkpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBfcG9ydCA9IHBvcnQ7XG4gICAgcmV0dXJuIGkgLSBzdGFydDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUGF0aCAodGV4dCwgc3RhcnQsIGVuZCkge1xuICAgIHZhciBwYXRoU3RhcnQgPSBzdGFydDtcbiAgICB2YXIgcGF0aEVuZCA9IGVuZDtcbiAgICB2YXIgZXNjYXBlID0gZmFsc2U7XG4gICAgdmFyIHBhdGg7XG4gICAgdmFyIGk7XG4gICAgdmFyIGNoO1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDw9IGVuZDsgKytpKSB7XG4gICAgICBjaCA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICAgIGlmIChjaCA9PT0gMHgyMyAvKicjJyovKSB7XG4gICAgICAgIHBhcnNlSGFzaCh0ZXh0LCBpLCBlbmQpO1xuICAgICAgICBwYXRoRW5kID0gaSAtIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmIChjaCA9PT0gMHgzRiAvKic/JyovKSB7XG4gICAgICAgIHBhcnNlUXVlcnkodGV4dCwgaSwgZW5kKTtcbiAgICAgICAgcGF0aEVuZCA9IGkgLSAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoIWVzY2FwZSAmJiBhdXRvZXNjYXBlW2NoXSkge1xuICAgICAgICBlc2NhcGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGF0aFN0YXJ0ID4gcGF0aEVuZCkge1xuICAgICAgX3BhdGhuYW1lID0gJy8nOyByZXR1cm47XG4gICAgfVxuICAgIGlmIChlc2NhcGUpIHtcbiAgICAgIHBhdGggPSBnZXRDb21wb25lbnRFc2NhcGVkKHRleHQsIHBhdGhTdGFydCwgcGF0aEVuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGggPSB0ZXh0LnNsaWNlKHBhdGhTdGFydCwgcGF0aEVuZCArIDEpO1xuICAgIH1cbiAgICBfcGF0aG5hbWUgPSBfcHJlcGVuZFNsYXNoID8gJy8nICsgcGF0aCA6IHBhdGg7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVF1ZXJ5ICh0ZXh0LCBzdGFydCwgZW5kKSB7XG4gICAgdmFyIHF1ZXJ5U3RhcnQgPSBzdGFydDtcbiAgICB2YXIgcXVlcnlFbmQgPSBlbmQ7XG4gICAgdmFyIGVzY2FwZSA9IGZhbHNlO1xuICAgIHZhciBpO1xuICAgIHZhciBjaDtcbiAgICB2YXIgcXVlcnk7XG5cbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8PSBlbmQ7ICsraSkge1xuICAgICAgY2ggPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY2ggPT09IDB4MjMgLyonIycqLykge1xuICAgICAgICBwYXJzZUhhc2godGV4dCwgaSwgZW5kKTtcbiAgICAgICAgcXVlcnlFbmQgPSBpIC0gMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKCFlc2NhcGUgJiYgYXV0b2VzY2FwZVtjaF0pIHtcbiAgICAgICAgZXNjYXBlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHF1ZXJ5U3RhcnQgPiBxdWVyeUVuZCkge1xuICAgICAgX3NlYXJjaCA9ICcnOyByZXR1cm47XG4gICAgfVxuICAgIGlmIChlc2NhcGUpIHtcbiAgICAgIHF1ZXJ5ID0gZ2V0Q29tcG9uZW50RXNjYXBlZCh0ZXh0LCBxdWVyeVN0YXJ0LCBxdWVyeUVuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXJ5ID0gdGV4dC5zbGljZShxdWVyeVN0YXJ0LCBxdWVyeUVuZCArIDEpO1xuICAgIH1cbiAgICBfc2VhcmNoID0gcXVlcnk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyaW5nICgpIHtcbiAgICB2YXIgc2VhcmNoID0gX3NlYXJjaDtcbiAgICBpZiAoc2VhcmNoLmNoYXJDb2RlQXQoMCkgPT09IDB4M0YgLyonPycqLykge1xuICAgICAgc2VhcmNoID0gc2VhcmNoLnNsaWNlKDEpO1xuICAgIH1cbiAgICBfcXVlcnkgPSBxdWVyeXN0cmluZy5wYXJzZShzZWFyY2gpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIYXNoICh0ZXh0LCBzdGFydCwgZW5kKSB7XG4gICAgaWYgKHN0YXJ0ID4gZW5kKSB7XG4gICAgICBfaGFzaCA9ICcnOyByZXR1cm47XG4gICAgfVxuICAgIF9oYXNoID0gZ2V0Q29tcG9uZW50RXNjYXBlZCh0ZXh0LCBzdGFydCwgZW5kKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlRnVsbFBhdGggKCkge1xuICAgIGlmIChfcGF0aG5hbWUgfHwgX3NlYXJjaCkge1xuICAgICAgcmV0dXJuIF9wYXRobmFtZSArIF9zZWFyY2g7XG4gICAgfVxuICAgIGlmICghX3BhdGhuYW1lICYmIF9zZWFyY2gpIHtcbiAgICAgIHJldHVybiAnLycgKyBfc2VhcmNoO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlOiBwYXJzZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNlcGFyYXRvciA9ICcmJztcbnZhciBlcXVhbHMgPSAnPSc7XG52YXIgcGx1cyA9ICclMjAnO1xudmFyIG1heEtleXMgPSAxMDAwO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIGlzQXJyYXkgKGlucHV0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkgKGlucHV0LCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoaW5wdXQsIHByb3ApO1xufVxuXG5mdW5jdGlvbiBwYXJzZSAocXMpIHtcbiAgdmFyIG1hcCA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICB2YXIgcnBsdXMgPSAvXFwrL2c7XG4gIHZhciB4O1xuICB2YXIgaWR4O1xuICB2YXIga3N0cjtcbiAgdmFyIHZzdHI7XG4gIHZhciBrO1xuICB2YXIgdjtcbiAgdmFyIGk7XG4gIHZhciBwYXJ0cyA9IHFzLnNwbGl0KHNlcGFyYXRvcik7XG4gIHZhciBsZW4gPSBwYXJ0cy5sZW5ndGg7XG4gIGlmIChsZW4gPiBtYXhLZXlzKSB7XG4gICAgbGVuID0gbWF4S2V5cztcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIHggPSBwYXJ0c1tpXS5yZXBsYWNlKHJwbHVzLCBwbHVzKTtcbiAgICBpZHggPSB4LmluZGV4T2YoZXF1YWxzKTtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkobWFwLCBrKSkge1xuICAgICAgbWFwW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkobWFwW2tdKSkge1xuICAgICAgbWFwW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcFtrXSA9IFttYXBba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwYXJzZTogcGFyc2Vcbn07XG4iXX0=
