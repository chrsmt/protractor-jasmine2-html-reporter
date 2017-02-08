function formatDate (timestamp, options) {
  var year = timestamp.getFullYear()
  var month = timestamp.getMonth()
  var date = timestamp.getDate()
  var day = timestamp.getDay()
  var hour = timestamp.getHours()
  var minute = timestamp.getMinutes()
  var seconds = timestamp.getSeconds()
  var milliseconds = timestamp.getMilliseconds()

  // set day name
  var days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday' ]
  var dayName = days[day]

  // set month name
  var months = [ 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December' ]
  var monthName = months[month]

  options = options || {}

  if (options.format === 'filename') {
    var filenameDate = year + ('0' + (month + 1)).slice(-2) + ('0' + date).slice(-2) +
                       '_' + hour + minute + seconds + milliseconds
    return filenameDate
  } else if (options.format === 'title') {
    var titleDate = dayName + ', ' + monthName + ' ' + date + ', ' + year
    return titleDate
  } else {
    throw new Error('Date format not set')
  }
}

module.exports = formatDate
