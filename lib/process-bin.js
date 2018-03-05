const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const PROCESS_BIN = path.join(__dirname, '../bin/process.js')

let tmpI = 0
function mktmp() {
  tmpI++
  return path.join(__dirname, `tmp_${Date.now()}_${tmpI}.json`)
}

function cleanupTmp() {
  const files = fs.readdirSync(__dirname)

  for (const name of files) {
    if (!/^tmp_/.test(name)) continue
    const fullPath = path.join(__dirname, name)
    fs.unlinkSync(fullPath)
  }
}

async function spawn(file, args) {
  const child = childProcess.spawn(file, args)
  return new Promise((resolve, reject) => {
    child.addListener('exit', () => resolve())
    child.addListener('error', reject)
  })
}

async function run(options) {
  const writeTmpInput = typeof options.input !== 'string'
  const outputFile = mktmp()
  const inputFile = writeTmpInput ? mktmp() : options.input

  if (writeTmpInput) {
    fs.writeFileSync(inputFile, JSON.stringify(options.input))
  }

  let results

  try {
    await spawn('node', [
      '--max-old-space-size=4000',
      PROCESS_BIN,
      '-p', typeof options.processor === 'string' ? options.processor : options.processor.path,
      '-i', inputFile,
      '-o', outputFile,
      options.force ? '--force' : '',
    ].filter(Boolean))

    results = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))
  } catch (err) {
    throw err
  } finally {
    try {
      fs.unlinkSync(outputFile)
      if (writeTmpInput) fs.unlinkSync(inputFile)
    } catch (err) {}
  }

  return results
}

module.exports = {run, cleanupTmp}
