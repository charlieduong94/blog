const fs = require('fs')
const yaml = require('js-yaml')
const logger = require('~/src/logging').logger(module)
const PostPage = require('~/src/pages/post')

const renderMarkdown = require('~/src/util/renderMarkdown')

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
  const postContent = renderMarkdown(rawPost)
  const sidebarContent = renderMarkdown("```js\nrequire('charlie.af')\n```")
  console.log(sidebarContent)

  return PostPage.stream({
    sidebarContent,
    postContent
  })
}
