require('require-self-ref')
require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')

require('marko/browser-refresh').enable()
require('lasso/browser-refresh').enable('*.marko *.css *.less')

const Koa = require('koa')
const serve = require('koa-static')
const mount = require('koa-mount')

const nodeMkdirp = require('mkdirp')
const fs = require('fs')
const logger = require('~/src/logging').logger(module)
const yaml = require('js-yaml')
const wordRegex = /\w+/g

const AVG_WORDS_READ_PER_MIN = 275
const META_DATA_DELIMITER = '---'
const POSTS_INPUT_DIR = `${__dirname}/posts`
const OUTPUT_DIR = `${__dirname}/dist`
const POSTS_OUTPUT_DIR = `${OUTPUT_DIR}/post`
const PAGES_OUTPUT_DIR = `${OUTPUT_DIR}/page`
const STATIC_DIR = `${OUTPUT_DIR}/static`
const MAX_POSTS_PER_PAGE = 5

require('lasso').configure({
  plugins: [
    'lasso-marko',
    'lasso-less'
  ],
  outputDir: STATIC_DIR,
  bundlingEnabled: true,
  minify: true,
  fingerprintsEnabled: true
})

const PostPage = require('~/src/pages/post')
const PostListPage = require('~/src/pages/post-list')
const renderMarkdown = require('~/src/util/renderMarkdown')

function calcPostReadTime (rawPostContent) {
  return Math.ceil(rawPostContent.match(wordRegex).length / AVG_WORDS_READ_PER_MIN)
}

async function mkdirp (directory) {
  return new Promise((resolve, reject) => {
    nodeMkdirp(directory, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

async function readFile (fileName) {
  return new Promise((resolve, reject) => {
    return fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

async function writeFile (stream, outputDir) {
  const writeStream = fs.createWriteStream(outputDir)
  const writePromise = new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  stream.pipe(writeStream)

  return writePromise
}

async function parsePost (filePath) {
  const rawPost = await readFile(filePath)
  const rawPostMetaData = rawPost.slice(0, rawPost.indexOf(META_DATA_DELIMITER))
  const rawPostContent = rawPost.slice(rawPost.indexOf(META_DATA_DELIMITER) +
    META_DATA_DELIMITER.length)

  const readTime = calcPostReadTime(rawPostContent)

  let postData = yaml.safeLoad(rawPostMetaData)
  postData.readTime = readTime
  postData.postContent = renderMarkdown(rawPostContent)

  return postData
}

async function writePost (postData, outputDir) {
  logger.info('Generating post', outputDir)
  const postStream = PostPage.stream(postData)
  return writeFile(postStream, `${outputDir}/index.html`)
}

async function writePage (options, outputDir) {
  const {
    posts,
    nextPage,
    prevPage
  } = options

  logger.info('Generating page', outputDir)
  await mkdirp(outputDir)

  const pageStream = PostListPage.stream({
    posts,
    nextPageLink: nextPage && `/page/${nextPage}`,
    prevPageLink: prevPage && `/page/${prevPage}`
  })

  return writeFile(pageStream, `${outputDir}/index.html`)
}

async function buildPages (posts) {
  let lastIndex = 0
  let currentPage = 1
  let pageOutputDir = `${PAGES_OUTPUT_DIR}/${currentPage}`

  for (let i = 1; i <= posts.length; i++) {
    if (i % MAX_POSTS_PER_PAGE === 0) {
      const prevPage = currentPage - 1
      const nextPage = lastIndex + MAX_POSTS_PER_PAGE < posts.length ? currentPage + 1 : undefined

      await writePage({
        posts: posts.slice(lastIndex, i),
        prevPage,
        nextPage
      }, pageOutputDir)

      lastIndex = i
      currentPage++
      pageOutputDir = `${PAGES_OUTPUT_DIR}/${currentPage}`
    }
  }

  if (lastIndex < posts.length) {
    await writePage({
      posts: posts.slice(lastIndex),
      prevPage: currentPage - 1
    }, pageOutputDir)
  }

  // for now, just copy the first page over to the index page
  logger.info('Generating index file', `${OUTPUT_DIR}/index.html`)
  await writeFile(fs.createReadStream(`${PAGES_OUTPUT_DIR}/1/index.html`), `${OUTPUT_DIR}/index.html`)
}

exports.build = async () => {
  const posts = fs.readdirSync(POSTS_INPUT_DIR)
  const parsedPosts = []
  const pages = []
  const pageIndex = 0
  const work = []

  // build and track each of the individual posts
  for (const post of posts) {
    try {
      const endPos = post.lastIndexOf('.')

      const postName = post.slice(0, endPos)
      const postData = await parsePost(`${POSTS_INPUT_DIR}/${post}`)
      postData.path = `/post/${postName}`

      parsedPosts.push(postData)
      const baseDir = `${POSTS_OUTPUT_DIR}/${postName}`
      await writePost(postData, baseDir)
    } catch (err) {
      throw err
    }
  }

  await Promise.all(work)

  // build pages based off of the posts
  return buildPages(parsedPosts)
}

exports.serve = async (port) => {
  await this.build()

  const app = new Koa()
  app.use(mount('/', serve(OUTPUT_DIR)))

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
