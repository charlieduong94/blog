const { Stream } = require('stream')
const colors = require('colors')

colors.setTheme({
  info: 'green',
  warn: 'yellow',
  error: 'orange',
  fatal: 'red',
  debug: 'blue'
})

const LEVELS = {
  60: 'fatal',
  50: 'error',
  40: 'warn',
  30: 'info',
  20: 'debug',
  10: 'trace'
}

class PrettyStream extends Stream {
  constructor () {
    super()
  }

  write (data) {
    const {
      name,
      msg,
      file,
      time,
      level
    } = data

    const logLevel = LEVELS[level]
    const coloredFile = `[ ${file} ]`.green
    this.emit('data', `${time.toISOString().blue} ${coloredFile} [${logLevel[logLevel]}] ${msg}\n`)
  }

  end () {
    this.emit('end')
    return true
  }
}

module.exports = PrettyStream
