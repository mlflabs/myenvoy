const url = require('url')

// this is Express middleware
module.exports = () => {
  // intercept each request
  return (req, res, next) => {
    const setHeaderIfUndefined = (header) => {
      if (res.get(header.key) === undefined) {
        res.set(header.key, header.value)
      }
    }
    // if the user-agent supplied an origin header (like a browser)
    if (req.headers.origin) {
      const parsed = url.parse(req.headers.origin)
      const headers = [{
        key: 'Access-Control-Allow-Credentials',
        value: 'true'
      }, {
        key: 'Access-Control-Allow-Origin',
        value: parsed.protocol + '//' + parsed.host
      }, {
        key: 'Access-Control-Allow-Headers',
        value: req.headers['access-control-request-headers']
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, PUT, POST, HEAD, DELETE'
      },
      {
        key: 'Access-Control-Expose-Headers',
        value: 'content-type, cache-control, accept-ranges, etag, server, x-couch-request-id, x-couch-update-newrev, x-couchdb-body-time'
      },
      {
        key: 'Access-Control-Max-Age',
        value: '86400'
      }]
      // check if the headers are already set by another middleware
      headers.forEach(setHeaderIfUndefined)
    }

    // continue to the next route handler
    next()
  }
}
