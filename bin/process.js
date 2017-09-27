#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const load = require('../lib/load')

const PREPROCESSED_FILENAME = 'preprocessed.json'

function getFullPath(filePath) {
  return path.resolve(process.cwd(), filePath)
}

async function runProcess(argv) {
  const inputPath = getFullPath(argv.input)

  let runs = []
  if (fs.statSync(inputPath).isDirectory()) {
    runs = load.traversePlotsFolder(inputPath)
  } else {
    runs = require(inputPath)
  }

  runs = runs.slice(0, argv.limit)

  const processor = require(getFullPath(argv.processor))
  const results = []
  for (const run of runs) {
    let result

    const processedPath = path.join(run.path, PREPROCESSED_FILENAME)
    if (!argv.force && fs.existsSync(processedPath)) {
      result = JSON.parse(fs.readFileSync(processedPath))
    } else {
      result = await processor.process(run)
    }

    results.push(result)
    console.log(`✅  Done processing ${result.url}`)
    fs.writeFileSync(processedPath, JSON.stringify(result))
  }

  const outputPath = getFullPath(argv.output)
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
}

const args = yargs
  .option('processor', {
    alias: 'p',
    type: 'string',
    required: true,
  })
  .option('force', {
    alias: 'f',
    type: 'boolean',
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    default: Infinity,
  })
  .option('input', {
    alias: 'i',
    type: 'string',
    required: true,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    required: true,
  })
  .argv

runProcess(args)
