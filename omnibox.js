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
