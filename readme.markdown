# omnibox

> Fast url parsing with a tiny footprint and extensive browser support

This module is mostly a re-implementation of [fast-url-parser][1] designed to make the footprint smaller and the browser support broader.

# install

```
npm install omnibox --save
```

```
bower install omnibox --save
```

# assumptions

Use `omnibox` only if you don't need any of the features shown below.

- Support for malformed input
- Support for a protocol other than `http`, `https`
- Basic authentication support `http://user:pwd@domain.com`
- IDNA support _(special characters in host)_
- `options`
- Anything that's not provided by the `.parse` method

If you need any of those features, use the more comprehensive [fast-url-parser][1] instead. Note that browser support is smaller because they rely on `Uint8Array`, and their footprint is also larger.

# `omnibox.parse(url)`

Parses a URL string and returns its different components. The query string is parsed by default. There's no option that prevents this behavior.

##### Example

Result for `omnibox.parse('https://stompflow.com/foo?bar=23&baz=abc#hash-parts')`.

```
{ protocol: 'https',
  hostname: 'stompflow.com',
  host: 'stompflow.com',
  port: undefined,
  pathname: '/foo',
  path: '/foo?bar=23&baz=abc',
  search: '?bar=23&baz=abc',
  hash: '#hash-parts',
  query: { bar: '23', baz: 'abc' } }
```

# License

MIT

[1]: https://github.com/petkaantonov/urlparser
