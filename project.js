require('require-self-ref')
require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')

require('marko/browser-refresh').enable()
require('lasso/browser-refresh').enable('*.marko *.css *.less')

const Koa = require('koa')
const Router = require('koa-path-router')
const serve = require('koa-static')
const mount = require('koa-mount')

const mkdirp = require('mkdirp')
const fs = require('fs')
const generatePostStream = require('~/src/util/generatePostStream')
const logger = require('~/src/logging').logger(module)

const POSTS_INPUT_DIR = `${__dirname}/posts`
const OUTPUT_DIR = `${__dirname}/dist`
const POSTS_OUTPUT_DIR = `${OUTPUT_DIR}/posts`
const STATIC_DIR = `${OUTPUT_DIR}/static`
const isProduction = true

require('lasso').configure({
  plugins: [
    'lasso-marko',
    'lasso-less'
  ],
  outputDir: STATIC_DIR,
  bundlingEnabled: isProduction,
  minify: isProduction,
  fingerprintsEnabled: isProduction
})

async function writePost (post) {
  const endPos = post.lastIndexOf('.')
  const outputFileName = `${post.slice(0, endPos)}.html`

  logger.info('Generating post', outputFileName)

  const postStream = await generatePostStream(`${POSTS_INPUT_DIR}/${post}`)
  const writeStream = fs.createWriteStream(`${POSTS_OUTPUT_DIR}/${outputFileName}`)

  const writePromise = new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  postStream.pipe(writeStream)

  return writePromise
}

exports.build = async () => {
  mkdirp.sync(POSTS_OUTPUT_DIR)
  const posts = fs.readdirSync(POSTS_INPUT_DIR)

  for (const post of posts) {
    try {
      await writePost(post)
    } catch (err) {
      throw err
    }
  }
}

exports.serve = async (port) => {
  const app = new Koa()
  const router = new Router()

  router.register({
    path: '/posts/:postName',
    handler: async (ctx) => {
      const [ postName ] = ctx.params
      const endPos = postName.lastIndexOf('.html')
      const fileName = `${postName.slice(0, endPos)}.md`
      logger.info('Generating', fileName)

      try {
        ctx.set('Content-Type', 'text/html')
        ctx.body = await generatePostStream(`${POSTS_INPUT_DIR}/${fileName}`)
      } catch (err) {
        ctx.body = 'Not found'
      }
    }
  })

  app.use(router.getRequestHandler())
  app.use(serve(OUTPUT_DIR))

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}...`)
      resolve()
    })
  })
}
