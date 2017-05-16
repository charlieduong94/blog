require('require-self-ref')

const Promise = require('bluebird')
const aws = require('aws-sdk')
const s3 = Promise.promisifyAll(new aws.S3())
const mime = require('mime')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const logger = require('~/src/logging').logger(module)

const DIST_DIR = path.normalize(path.join(__dirname, `..`, 'dist'))
const BUCKET_NAME = 'charlie-af'
const CONCURRENCY = 5

async function getFiles (globPath) {
  return new Promise((resolve, reject) => {
    glob(globPath, (err, files) => {
      if (err) {
        return reject(err)
      }
      resolve(files)
    })
  })
}

async function upload (file) {
  const key = file.slice(DIST_DIR.length + 1)

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(file),
    ContentType: mime.lookup(file)
  }
  console.log(params.ContentType)

  logger.info(`Uploading ${key}...`)
  return s3.uploadAsync(params).tap(() => {
    logger.info('Successfully uploaded', key)
  })
}

;(async () => {
  const files = await getFiles(`${DIST_DIR}/**/*.*`)

  try {
    await Promise.map(files, async (file) => {
      return upload(file)
    }, {
      concurrency: CONCURRENCY
    })
    logger.info('Upload complete!')
  } catch (err) {
    console.error(err)
  }
})()
