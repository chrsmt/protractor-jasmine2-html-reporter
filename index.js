var fs = require('fs')
var mkdirp = require('mkdirp')
var _ = require('lodash')
var path = require('path')
// var async = require('async')// not used
var hat = require('hat')

require('string.prototype.startswith')

var UNDEFINED
var exportObject = exports
var reportDate
var summaryStats = {
  suites: 0,
  specs: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  disabled: 0
}

function sanitizeFilename (name) {
  name = name.replace(/\s+/gi, '-') // Replace white space with dash
  return name.replace(/[^a-zA-Z0-9\-]/gi, '') // Strip any special charactere
}
// function trim (str) { return str.replace(/^\s+/, '').replace(/\s+$/, '') }// not used
function elapsed (start, end) { return (end - start) / 1000 }
function isFailed (obj) { return obj.status === 'failed' }// can get rid of this by updating screenshot logic
function parseDecimalRoundAndFixed (num, dec) {
  var d = Math.pow(10, dec)
  return isNaN((Math.round(num * d) / d).toFixed(dec)) === true ? 0 : (Math.round(num * d) / d).toFixed(dec)
}

function extend (dupe, obj) { // performs a shallow copy of all props of `obj` onto `dupe`
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      dupe[prop] = obj[prop]
    }
  }
  return dupe
}

function escapeInvalidHtmlChars (str) {
  return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function getQualifiedFilename (dir, filename, separator) {
  if (dir && dir.substr(-1) !== separator && filename.substr(0) !== separator) {
    dir += separator
  }
  return dir + filename
}

function log (str) {
  var con = global.console || console
  if (con && con.log) {
    con.log(str)
  }
}

function rmdir (dir) {
  try {
    var list = fs.readdirSync(dir)
    for (var i = 0; i < list.length; i++) {
      var filename = path.join(dir, list[i])
      var stat = fs.statSync(filename)

      if (stat.isDirectory()) {
                // rmdir recursively
        rmdir(filename)
      } else {
                // rm fiilename
        fs.unlinkSync(filename)
      }
    }
    fs.rmdirSync(dir)
  } catch (e) { log('problem trying to remove a folder:' + dir) }
}

function copyFile (source, target, cb) {
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
}

function moveCss (dir) {
  // move css file
  // var filepath = nodeJsPath.join(path, filename)
  var cssFile = path.join(__dirname, 'style.css')
  var reportCssFile = path.join(dir, 'style.css')

  copyFile(cssFile, reportCssFile, function (err) {
    if (err) {
      throw new Error('Unable to copy CSS:', err)
    }
  })
}

// TODO: add arguments for formatting date/day/etc.
function getReportDate () {
  if (reportDate === undefined) {
    reportDate = new Date()
  }
  return reportDate.getFullYear() + '-' +
            ('0' + (reportDate.getMonth() + 1)).slice(-2) + '-' +
            ('0' + reportDate.getDate()).slice(-2) + ' ' +
            reportDate.getHours() + '' +
            reportDate.getMinutes() + '' +
            reportDate.getSeconds() + ',' +
            reportDate.getMilliseconds()
}

function Jasmine2HTMLReporter (options) {
  var self = this

  self.started = false
  self.finished = false
  // sanitize arguments
  options = options || {}
  self.takeScreenshots = options.takeScreenshots === UNDEFINED ? true : options.takeScreenshots
  self.savePath = options.savePath || ''
  self.takeScreenshotsOnlyOnFailures = options.takeScreenshotsOnlyOnFailures === UNDEFINED ? false : options.takeScreenshotsOnlyOnFailures
  self.screenshotsFolder = (options.screenshotsFolder || 'screenshots').replace(/^\//, '') + '/'
  self.useDotNotation = options.useDotNotation === UNDEFINED ? true : options.useDotNotation
  self.fixedScreenshotName = options.fixedScreenshotName === UNDEFINED ? false : options.fixedScreenshotName
  self.consolidate = options.consolidate === UNDEFINED ? true : options.consolidate
  self.consolidateAll = self.consolidate !== false && (options.consolidateAll === UNDEFINED ? true : options.consolidateAll)
  self.fileNameSeparator = options.fileNameSeparator === UNDEFINED ? '-' : options.fileNameSeparator
  self.fileNamePrefix = options.fileNamePrefix === UNDEFINED ? '' : options.fileNamePrefix
  self.fileNameSuffix = options.fileNameSuffix === UNDEFINED ? '' : options.fileNameSuffix
  self.fileNameDateSuffix = options.fileNameDateSuffix === UNDEFINED ? false : options.fileNameDateSuffix
  self.fileName = options.fileName === UNDEFINED ? 'htmlReport' : options.fileName
  self.cleanDestination = options.cleanDestination === UNDEFINED ? true : options.cleanDestination
  self.showPassed = options.showPassed === UNDEFINED ? true : options.showPassed
  self.logo = options.logo === UNDEFINED ? false : options.logo

  var suites = []
  var currentSuite = null

  var totalSpecsExecuted = 0
  var totalSpecsDefined

  // when use use fit, jasmine never calls suiteStarted / suiteDone, so make a fake one to use
  var fakeFocusedSuite = {
    id: 'focused',
    description: 'focused specs',
    fullName: 'focused specs'
  }

  var __suites = {}
  var __specs = {}

  function getSuite (suite) {
    __suites[suite.id] = extend(__suites[suite.id] || {}, suite)
    return __suites[suite.id]
  }
  function getSpec (spec) {
    __specs[spec.id] = extend(__specs[spec.id] || {}, spec)
    return __specs[spec.id]
  }

  function getReportFilename (specName) {
    var name = ''
    console.log(self.fileNamePrefix)
    if (self.fileNamePrefix) {
      name += self.fileNamePrefix + self.fileNameSeparator
    }

    name += self.fileName

    if (specName !== undefined) {
      name += self.fileNameSeparator + specName
    }

    if (self.fileNameSuffix) {
      name += self.fileNameSeparator + self.fileNameSuffix
    }

    if (self.fileNameDateSuffix) {
      name += self.fileNameSeparator + getReportDate()
    }

    return name
  }

  self.jasmineStarted = function (summary) {
    totalSpecsDefined = summary && summary.totalSpecsDefined || NaN
    exportObject.startTime = new Date()
    self.started = true

    // Delete previous reports unless cleanDirectory is false
    if (self.cleanDestination) {
      rmdir(self.savePath)
    }
  }

  self.suiteStarted = function (suite) {
    suite = getSuite(suite)
    suite._startTime = new Date()
    suite._specs = []
    suite._suites = []
    suite._failures = 0
    suite._skipped = 0
    suite._disabled = 0
    suite._parent = currentSuite
    if (!currentSuite) {
      suites.push(suite)
    } else {
      currentSuite._suites.push(suite)
    }
    currentSuite = suite
    summaryStats.suites++
  }

  self.specStarted = function (spec) {
    if (!currentSuite) {
      // focused spec (fit) -- suiteStarted was never called
      self.suiteStarted(fakeFocusedSuite)
    }
    spec = getSpec(spec)
    spec._startTime = new Date()
    spec._suite = currentSuite
    currentSuite._specs.push(spec)
  }

  self.specDone = function (spec) {
    spec = getSpec(spec)
    spec._endTime = new Date()

    switch (spec.status) {
      case 'passed':
        summaryStats.passed++
        break
      case 'pending':
        spec._suite._skipped++
        summaryStats.skipped++
        break
      case 'disabled':
        spec._suite._disabled++
        summaryStats.disabled++
        break
      case 'failed':
        spec._suite._failures++
        summaryStats.failed++
        break
      default:
        throw new Error('Unable to handle spec status:', spec.status)
    }

    totalSpecsExecuted++

    // Take screenshots taking care of the configuration
    if ((self.takeScreenshots && !self.takeScreenshotsOnlyOnFailures) ||
      (self.takeScreenshots && self.takeScreenshotsOnlyOnFailures && isFailed(spec))) {
      if (!self.fixedScreenshotName) {
        spec.screenshot = hat() + '.png'
      } else {
        spec.screenshot = sanitizeFilename(spec.description) + '.png'
      }

      browser.takeScreenshot().then(function (png) {
        var screenshotPath = path.join(
                    self.savePath,
                    self.screenshotsFolder,
                    spec.screenshot)

        mkdirp(path.dirname(screenshotPath), function (err) {
          if (err) {
            throw new Error('Could not create directory for ' + screenshotPath)
          }
          writeScreenshot(png, screenshotPath)
        })
      })
    }
  }

  self.suiteDone = function (suite) {
    suite = getSuite(suite)
    if (suite._parent === UNDEFINED) {
      // disabled suite (xdescribe) -- suiteStarted was never called
      self.suiteStarted(suite)
    }
    suite._endTime = new Date()
    currentSuite = suite._parent
  }

  self.jasmineDone = function () {
    if (currentSuite) {
      // focused spec (fit) -- suiteDone was never called
      self.suiteDone(fakeFocusedSuite)
    }

    var output = ''
    for (var i = 0; i < suites.length; i++) {
      output += self.getOrWriteNestedOutput(suites[i])
    }
    // if we have anything to write here, write out the consolidated file
    if (output) {
      wrapOutputAndWriteFile(getReportFilename(), output)
    }
    // log('Specs skipped but not reported (entire suite skipped or targeted to
    // specific specs)', totalSpecsDefined - totalSpecsExecuted + totalSpecsDisabled);

    self.finished = true
    // this is so phantomjs-testrunner.js can tell if we're done executing
    exportObject.endTime = new Date()
  }

  self.getOrWriteNestedOutput = function (suite) {
    var output = suiteAsHtml(suite)
    for (var i = 0; i < suite._suites.length; i++) {
      output += self.getOrWriteNestedOutput(suite._suites[i])
    }
    if (self.consolidateAll || self.consolidate && suite._parent) {
      return output
    } else {
      // if we aren't supposed to consolidate output, just write it now
      wrapOutputAndWriteFile(generateFilename(suite), output)
      return ''
    }
  }

  // helper functions with closure access for simplicity
  function generateFilename (suite) {
    return getReportFilename(getFullyQualifiedSuiteName(suite, true))
  }

  function getFullyQualifiedSuiteName (suite, isFilename) {
    var fullName
    if (self.useDotNotation || isFilename) {
      fullName = suite.description
      for (var parent = suite._parent; parent; parent = parent._parent) {
        fullName = parent.description + '.' + fullName
      }
    } else {
      fullName = suite.fullName
    }

    // Either remove or escape invalid HTML characters
    if (isFilename) {
      var fileName = ''
      var rFileChars = /[\w\.]/
      var chr

      while (fullName.length) {
        chr = fullName[0]
        fullName = fullName.substr(1)
        if (rFileChars.test(chr)) {
          fileName += chr
        }
      }
      return fileName
    } else {
      return escapeInvalidHtmlChars(fullName)
    }
  }

  var writeScreenshot = function (data, filename) {
    var stream = fs.createWriteStream(filename)
    stream.write(new Buffer(data, 'base64'))
    stream.end()
  }

  function suiteAsHtml (suite) {
    var html = '\n<article class="suite">\n'
    html += '<header>\n'
    html += '<h2>' + getFullyQualifiedSuiteName(suite) + ' - ' +
      elapsed(suite._startTime, suite._endTime) + 's</h2>'
    html += '<ul class="stats">\n'
    html += '<li>Tests: <strong>' + suite._specs.length + '</strong></li>\n'
    html += '<li>Skipped: <strong>' + suite._skipped + '</strong></li>\n'
    html += '<li>Failures: <strong>' + suite._failures + '</strong></li>\n'
    html += '</ul>\n</header>\n'

    for (var i = 0; i < suite._specs.length; i++) {
      var spec = suite._specs[i]
      html += '<div class="spec">'
      html += specAsHtml(spec)
      html += '<div class="resume">'
      if (spec.screenshot !== UNDEFINED) {
        html += '<a href="' + self.screenshotsFolder + spec.screenshot + '">'
        html += '<img src="' + self.screenshotsFolder + spec.screenshot +
          '" class="screenshot" width="100" height="100" />'
        html += '</a>'
      }
      html += '<br />'
      var numTests = spec.failedExpectations.length + spec.passedExpectations.length
      var percentage = (spec.passedExpectations.length * 100) / numTests
      html += '<span>Steps passed: ' + parseDecimalRoundAndFixed(percentage, 2) +
        '%</span><br /><progress max="100" value="' + Math.round(percentage) + '"></progress>'
      html += '</div>\n'
      html += '</div>\n'
    }
    html += '\n</article>\n'
    return html
  }
  function specAsHtml (spec) {
    var html = '<div class="description">\n'
    html += '<h3>' + escapeInvalidHtmlChars(spec.description) + ' - ' +
      elapsed(spec._startTime, spec._endTime) + 's</h3>\n'

    if (spec.failedExpectations.length > 0 || spec.passedExpectations.length > 0) {
      html += '<ul>'
      _.each(spec.failedExpectations, function (expectation) {
        html += '<li>'
        html += expectation.message + '<span style="padding:0 1em;color:red;">&#10007;</span>'
        html += '</li>\n'
      })
      if (self.showPassed === true) {
        _.each(spec.passedExpectations, function (expectation) {
          html += '<li>'
          html += expectation.message + '<span style="padding:0 1em;color:green;">&#10003;</span>'
          html += '</li>\n'
        })
      }
      html += '</ul>\n</div>\n'
    } else {
      html += '<span class="skipped">***Skipped***</span>'
      html += '</div>\n'
    }
    return html
  }

  self.writeFile = function (filename, text) {
    var errors = []
    var dir = self.savePath

    // move css into report directory
    moveCss(dir)

    function phantomWrite (dir, filename, text) {
      // turn filename into a qualified path
      filename = getQualifiedFilename(dir, filename, window.fs_path_separator)
      // write via a method injected by phantomjs-testrunner.js
      __phantom_writeFile(filename, text)
    }

    function nodeWrite (dir, filename, text) {
      require('mkdirp').sync(dir) // make sure the path exists
      var filePath = path.join(dir, filename)
      var htmlfile = fs.openSync(filePath, 'w')
      fs.writeSync(htmlfile, text, 0)
      fs.closeSync(htmlfile)
      return
    }

    // Attempt writing with each possible environment.
    // Track errors in case no write succeeds
    try {
      phantomWrite(dir, filename, text)
      return
    } catch (e) { errors.push('  PhantomJs attempt: ' + e.message) }
    try {
      nodeWrite(dir, filename, text)
      return
    } catch (f) { errors.push('  NodeJS attempt: ' + f.message) }

        // If made it here, no write succeeded.  Let user know.
    log("Warning: writing html report failed for '" + dir + "', '" +
            filename + "'. Reasons:\n" +
            errors.join('\n')
        )
  }

  function writeHtmlPrefix () {
    var prefix = '<!DOCTYPE html><html><head lang=en><meta charset=UTF-8>\n' +
      '<title>Test Report -  ' + getReportDate() + '</title>\n' +
      '<link rel="stylesheet" type="text/css" href="style.css"></head>\n' +
      '<link href="https://fonts.googleapis.com/css?family=Roboto+Condensed" rel="stylesheet">\n'
    prefix += '<body>\n<div id="summary">\n<div id="summaryTitle"><h1>Test Results - ' + getReportDate() + '</h1>'
    // insert custom logo if provided in options
    if (options.logo) {
      prefix += '<img src="' + options.logo.url +
          '" width="' + options.logo.width +
          '" height="' + options.logo.height + '" />'
    }
    prefix += '</div>\n<div id="summaryStats">SUITES:' + summaryStats.suites +
      ' <strong>Total Tests: <span class=total>' + totalSpecsExecuted +
      '</span></strong> [ Passed: <span class=passed>' + summaryStats.passed +
      '</span> ] [ Skipped: <span class=skipped>' + summaryStats.skipped +
      '</span> ] [ Failed: <span class=failed>' + summaryStats.failed +
      '</span> ] </div>\n</div>\n\n<section id="specDetails">'

    return prefix
  }

  var suffix = '\n</section>\n</body>\n</html>'

  function wrapOutputAndWriteFile (filename, text) {
    if (filename.substr(-5) !== '.html') { filename += '.html' }
    self.writeFile(filename, (writeHtmlPrefix() + text + suffix))
  }

  return this
}

module.exports = Jasmine2HTMLReporter
