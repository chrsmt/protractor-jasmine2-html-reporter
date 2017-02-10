// An example configuration file
exports.config = {

    // Capabilities to be passed to the webdriver instance.
  capabilities: {
    'browserName': 'chrome'
    // 'browserName': 'phantomjs'
  },
  framework: 'jasmine2',

    // directConnect: true,

  specs: ['test/**/*[sS]pec.js'],

  onPrepare: function () {
    return global.browser.getProcessedConfig().then(function (config) {
      var Jasmine2HtmlReporter = require('./index.js')

      jasmine.getEnv().addReporter(new Jasmine2HtmlReporter({
        savePath: './test/reports/', // default: ./
        // takeScreenshots: false, // default: true
        // takeScreenshotsOnlyOnFailures: true, // default: false
        // screenshotsFolder: 'images', // default: screenshots
        // fixedScreenshotName: true, // default: false
        // fileNamePrefix: 'Prefix', // default: nothing
        // consolidate: false, // default: true
        // consolidateAll: false, // default: true
        // cleanDestination: false, // default: true
        // showPassed: false, // default: true
        // fileNameSeparator: '_', // default: -
        // fileNameDateSuffix: true, // default: false
        // title: 'QA Automation Test Results', // default: 'Test Results'
        // titleColors: {
        //   text: '#ededed',
        //   background: 'radial-gradient(farthest-corner at 10% 3%, #0d95bf, #154473)'
        // }, // supports any css declaration that can be passed to 'background'
        // default: nothing --NEED TO CHANGE TO SET DEFAULTS IF MISSING OPTIONS
        // logo: {
        //   url: '../../resources/sample-logo-white.png', // url or path relative to report location
        //   width: 221,
        //   height: 65
        // } // default: nothing --NEED TO CHANGE TO SET DEFAULTS IF MISSING OPTIONS

      }))
    })
  }
}
