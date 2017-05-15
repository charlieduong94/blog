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
const logger = require('~/src/logging').logger(module)
const yaml = require('js-yaml')
const wordRegex = /\w+/g

const AVG_WORDS_READ_PER_MIN = 275
const META_DATA_DELIMITER = '---'
const POSTS_INPUT_DIR = `${__dirname}/posts`
const OUTPUT_DIR = `${__dirname}/dist`
const POSTS_OUTPUT_DIR = `${OUTPUT_DIR}/post`
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

const PostPage = require('~/src/pages/post')
const PostListPage = require('~/src/pages/index')
const renderMarkdown = require('~/src/util/renderMarkdown')

function calcPostReadTime (rawPostContent) {
  return Math.ceil(rawPostContent.match(wordRegex).length / AVG_WORDS_READ_PER_MIN)
}

async function readFileAsync (fileName) {
  return new Promise((resolve, reject) => {
    return fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

async function parsePost (filePath) {
  const rawPost = await readFileAsync(filePath)
  const rawPostMetaData = rawPost.slice(0, rawPost.indexOf(META_DATA_DELIMITER))
  const rawPostContent = rawPost.slice(rawPost.indexOf(META_DATA_DELIMITER) +
    META_DATA_DELIMITER.length)

  const readTime = calcPostReadTime(rawPostContent)

  let postData = yaml.safeLoad(rawPostMetaData)
  postData.readTime = readTime
  postData.postContent = renderMarkdown(rawPostContent)

  return postData
}

async function writePost (postData, outputFileName) {
  const postStream = PostPage.stream(postData)
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
  const parsedPosts = []
  const pages = []
  const pageIndex = 0

  // build each of the individual posts
  for (const post of posts) {
    try {
      const endPos = post.lastIndexOf('.')
      const outputFileName = `${post.slice(0, endPos)}.html`

      logger.info('Generating post', outputFileName)

      const postData = await parsePost(`${POSTS_INPUT_DIR}/${post}`)
      parsedPosts.push({
        title: postData.title,
        date: postData.date,
        description: postData.description
      })

      await writePost(postData, outputFileName)
    } catch (err) {
      throw err
    }
  }
}

exports.serve = async (port) => {
  const app = new Koa()
  const router = new Router()

  const posts = fs.readdirSync(POSTS_INPUT_DIR)
  const parsedPosts = []

  for (const post of posts) {
    let data = await parsePost(`${POSTS_INPUT_DIR}/${post}`)
    data.link = `/post/${post.slice(0, post.lastIndexOf('.'))}`
    parsedPosts.push(data)
  }

  router.register({
    path: '/',
    async handler (ctx) {
      const posts = fs.readdirSync(POSTS_INPUT_DIR)

      ctx.set('Content-Type', 'text/html')
      ctx.body = PostListPage.stream({
        posts: parsedPosts.slice(0, 5),
        nextPage: parsedPosts.length > 5 ? 2 : undefined
      })
    }
  })

  router.register({
    path: '/posts/:pageNum',
    async handler (ctx) {
      const [ pageNum ] = ctx.params
      const page = +pageNum

      if (page === 1) {
        ctx.redirect('/')
      } else {
        let postIndex = page - 1
        let startPos = 5 * postIndex
        let endPos = (5 * postIndex) + 5
        let postsSlice = parsedPosts.slice(startPos, endPos)

        let prevPage = page - 1
        let nextPage = endPos < parsedPosts.length ? page + 1 : undefined

        ctx.set('Content-Type', 'text/html')
        ctx.body = PostListPage.stream({
          posts: postsSlice,
          prevPage,
          nextPage
        })
      }
    }
  })

  router.register({
    path: '/post/:postName',
    async handler (ctx) {
      const [ postName ] = ctx.params
      const fileName = `${postName}.md`
      logger.info('Generating', fileName)

      try {
        ctx.set('Content-Type', 'text/html')
        const postData = await parsePost(`${POSTS_INPUT_DIR}/${fileName}`)
        ctx.body = PostPage.stream(postData)
      } catch (err) {
        logger.error(err)
        ctx.body = err.message
      }
    }
  })

  app.use(router.getRequestHandler())
  app.use(serve(OUTPUT_DIR))

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}...`)
      if (process.send) {
        process.send('online')
      }
      resolve()
    })
  })
}
