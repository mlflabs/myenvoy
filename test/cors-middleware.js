module.exports = function (req, res, next) {
  if (req.headers.origin !== 'http://corstest.com') {
    return next()
  }
  res.set('Access-Control-Allow-Credentials', 'foo')
  res.set('Access-Control-Allow-Origin', 'bar')
  res.set('Access-Control-Allow-Headers', 'baz')

  next()
}
