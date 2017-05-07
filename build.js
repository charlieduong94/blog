const logger = require('./src/logging').logger(module)
const project = require('./project')

;(async () => {
  try {
    await project.build()
    logger.info('Build complete')
  } catch (err) {
    logger.error(err)
  }
})()
