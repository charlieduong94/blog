const bunyan = require('bunyan')
const path = require('path')

// Todo: find better way of getting project root
// incase this file moves
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')

const PrettyStream = require('./prettyStream')
const prettyStream = new PrettyStream()
prettyStream.pipe(process.stdout)

const logger = bunyan.createLogger({
  name: 'bloggggg',
  streams: [
    {
      level: 'debug',
      type: 'raw',
      stream: prettyStream
    }
  ]
})

exports.logger = (module) => {
  // get filename relative to project root
  const file = module.filename.slice(PROJECT_ROOT.length)
  return logger.child({ file })
}
