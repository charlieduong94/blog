const logger = require('./src/logging').logger(module)
const project = require('./project')

const PORT = process.env.PORT || 8080

;(async () => {
  try {
    await project.serve(PORT)
  } catch (err) {
    logger.error(err)
  }
})()
