const fs = require('fs')
const logger = require('~/src/logging').logger(module)
const highlight = require('highlight.js')
const Post = require('~/src/pages/post')

const marked = require('marked')
const renderer = new marked.Renderer()

renderer.code = (code) => {
  const highlightedCode = highlight.highlightAuto(code).value
  return `<pre><code class='hljs'>${highlightedCode}</code></pre>`
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

module.exports = async (filePath) => {
  const rawPost = await readFileAsync(filePath)
  const postContent = marked(rawPost, { renderer })

  return Post.stream({
    content: postContent
  })
}
