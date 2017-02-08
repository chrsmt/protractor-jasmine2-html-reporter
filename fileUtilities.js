var fs = require('fs')
var path = require('path')

var fileUtilities = {
  sanitizeFilename: function (name) {
    // replace white space with dash
    name = name.replace(/\s+/gi, '-')
    // strip any special characters
    return name.replace(/[^a-zA-Z0-9\-]/gi, '')
  },

  escapeInvalidHtmlChars: function (str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  },

  trim: function (str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '')
  },

  copyFile: function (source, target, cb) {
    var cbCalled = false

    var rd = fs.createReadStream(source)
    rd.on('error', done)

    var wr = fs.createWriteStream(target)
    wr.on('error', done)
    wr.on('close', function (ex) {
      done()
    })
    rd.pipe(wr)

    function done (err) {
      if (!cbCalled) {
        cb(err)
        cbCalled = true
      }
    }
  },

  rmdir: function (dir) {
    try {
      var list = fs.readdirSync(dir)
      for (var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i])
        var stat = fs.statSync(filename)

        if (stat.isDirectory()) {
          // rmdir recursively
          this.rmdir(filename)
        } else {
          // rm filename
          fs.unlinkSync(filename)
        }
      }
      fs.rmdirSync(dir)
    } catch (e) {
      throw new Error('Problem trying to remove a folder:' + dir)
    }
  },

  getQualifiedFilename: function (dir, filename, separator) {
    if (dir && dir.substr(-1) !== separator && filename.substr(0) !== separator) {
      dir += separator
    }
    return dir + filename
  }
}

module.exports = fileUtilities
