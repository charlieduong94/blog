const marked = require('marked')
const highlight = require('highlight.js')
const renderer = new marked.Renderer()

renderer.code = (code) => {
  const highlightedCode = highlight.highlightAuto(code).value
  return `<pre><code class='hljs'>${highlightedCode}</code></pre>`
}

module.exports = (markdown) => {
  return marked(markdown, { renderer })
}
