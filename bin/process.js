#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const load = require('../lib/load')

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
    const result = await processor.process(run)
    results.push(result)
    console.log(`✅  Done processing ${result.url}`)
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
