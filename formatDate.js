function formatDate (timestamp, options) {
  var year = timestamp.getFullYear()
  var month = timestamp.getMonth()
  var date = timestamp.getDate()
  var day = timestamp.getDay()
  var hours = timestamp.getHours()
  var minutes = ('0' + timestamp.getMinutes()).slice(-2)
  var seconds = ('0' + timestamp.getSeconds()).slice(-2)
  var milliseconds = timestamp.getMilliseconds()

  // set day name
  var days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday' ]
  var dayName = days[day]

  // set month name
  var months = [ 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December' ]
  var monthName = months[month]

  // set time for 12-hour format
  var period = hours >= 12 ? 'pm' : 'am'
  var hours12 = hours % 12 || 12
  var time = hours12 + ':' + minutes + period

  options = options || {}

  if (options.format === 'filename') {
    var filenameDate = year + ('0' + (month + 1)).slice(-2) + ('0' + date).slice(-2) +
                       '_' + hours + minutes + seconds + milliseconds
    return filenameDate
  } else if (options.format === 'title') {
    var titleDate = dayName + ', ' + monthName + ' ' + date + ', ' + year + ' - ' + time
    return titleDate
  } else {
    throw new Error('Date format not set')
  }
}

module.exports = formatDate
