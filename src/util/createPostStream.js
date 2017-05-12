const fs = require('fs')
const yaml = require('js-yaml')
const logger = require('~/src/logging').logger(module)
const PostPage = require('~/src/pages/post')

const renderMarkdown = require('~/src/util/renderMarkdown')

const metaDataDelimiter = '---'

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

module.exports = async (filePath) => {
  const rawPost = await readFileAsync(filePath)
  const rawPostMetaData = rawPost.slice(0, rawPost.indexOf('---'))
  const rawPostContent = rawPost.slice(rawPost.indexOf('---') + metaDataDelimiter.length)

  const {
    title,
    description,
    date
  } = yaml.safeLoad(rawPostMetaData)

  const postContent = renderMarkdown(rawPostContent)

  return PostPage.stream({
    title,
    description,
    date,
    postContent
  })
}
