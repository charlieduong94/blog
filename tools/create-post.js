const fs = require('fs')
const { spawn } = require('child_process')
const yaml = require('js-yaml')
const path = require('path')
const inquirer = require('inquirer')
const moment = require('moment')
const postsDir = path.normalize(path.join(__dirname, '..', 'posts'))


;(async () => {
  const queries = [
    {
      name: 'title',
      type: 'input',
      message: 'Enter the title of the post:'
    },
    {
      name: 'description',
      type: 'input',
      message: 'Enter a brief description of the post:'
    }
  ]

  const { title, description } = await inquirer.prompt(queries)
  const date = moment().format('MMM Do YYYY')
  const connectedDate = date.split(' ').join('-')

  const postMetaData = yaml.safeDump({
    title, description, date
  })

  const post = `${postMetaData}---\n`

  let fileName = `${connectedDate}-${title.split(' ').join('-')}`
  if (fileName.endsWith('-')) {
    fileName = fileName.slice(0, fileName.length - 1)
  }
  fileName += '.md'

  const filePath = path.join(postsDir, fileName)

  const writeStream = fs.createWriteStream(filePath)
  writeStream.write(post)
  writeStream.end()

  const { edit } = await inquirer.prompt({
    name: 'edit',
    type: 'confirm',
    message: 'Edit now?'
  })

  if (edit) {
    let editorProcess = spawn(process.env[`EDITOR`], [ filePath ], {
      stdio: 'inherit'
    })

    editorProcess.on('exit', () => {
      console.log('All done!')
    })
  }
})()

