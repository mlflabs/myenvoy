const stream = require('stream')

module.exports = (myId, removeOwnerId) => {
  // stream transformer that removes auth details from documents
  return (onlyuser) => {
    // whether we owe a comma to the next line out output
    let commaOwed = false

    // output the response, adding the owed comma or not
    const formatResponse = (str, addComma) => {
      if (addComma) {
        return ',\n' + str
      }
      return '\n' + str
    }

    const stripAuth = (obj, onlyuser) => {
      let chunk = obj
      let endsInComma = false

      // If the line ends with a comma, this would break JSON parsing.
      if (obj.endsWith(',')) {
        chunk = obj.slice(0, -1)
        endsInComma = true
      }

      let row
      try {
        row = JSON.parse(chunk)
      } catch (e) {
        return obj + '\n' // An incomplete fragment: pass along as is.
      }

      // if this line doesn't belong to the owner, filter it outs
      if (onlyuser && row.id && !myId(row.id, onlyuser)) {
        return ''
      }

      // remove ownerid from the id
      if (row.id) {
        row.id = removeOwnerId(row.id)
      }
      if (row.key) {
        row.key = removeOwnerId(row.key)
      }
      if (row._id) {
        row._id = removeOwnerId(row._id)
      }
      if (row.doc && row.doc._id) {
        row.doc._id = removeOwnerId(row.doc._id)
      }

      // Repack, and add the trailling comma if required
      const retval = JSON.stringify(row)
      const str = formatResponse(retval, commaOwed)
      // recalculate whether we owe another comma next time
      commaOwed = endsInComma
      return str
    }

    const tr = new stream.Transform({ objectMode: true })
    tr._transform = function (obj, encoding, done) {
      const data = stripAuth(obj, onlyuser)
      if (data) {
        this.push(data)
      }
      done()
    }
    return tr
  }
}
