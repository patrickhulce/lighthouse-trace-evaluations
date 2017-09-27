#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const yargs = require('yargs')

const load = require('../lib/load')
const runProcess = require('../lib/process-bin').run

function getFullPath(filePath) {
  return path.resolve(process.cwd(), filePath)
}

async function getCollatedResults(argv, analyzer) {
  if (argv.collated) {
    if (argv.input.length !== 1) throw new Error('Can only specify one collated input')
    const collated = JSON.parse(fs.readFileSync(getFullPath(argv.input[0]), 'utf-8'))
    console.log(`✅  Loaded ${collated.length} collated results`)
    return collated
  }

  const processors = analyzer.getProcessors()
  if (processors.length !== argv.input.length) {
    throw new Error(`Expected ${processors.length} input but received ${argv.input.length}`)
  }

  const inputPromises = []
  for (const inputPath of argv.input) {
    const processor = processors[argv.input.indexOf(inputPath)]
    if (fs.statSync(inputPath).isDirectory()) {
      const runs = load.traversePlotsFolder(inputPath)
      const numToProcess = Math.min(argv.limit, runs.length)
      const numPerChunk = Math.ceil(numToProcess / argv.split)
      const numChunks = Math.ceil(numToProcess / numPerChunk)

      const resultPromises = []
      for (let i = 0; i < numChunks; i++) {
        const input = runs.slice(i * numPerChunk, (i + 1) * numPerChunk)
        resultPromises.push(runProcess({processor, input}))
      }

      const resultsPromise = Promise.all(resultPromises).then(results => results.reduce((a, b) => a.concat(b)))
      inputPromises.push(resultsPromise)
    } else {
      inputPromises.push(JSON.parse(fs.readFileSync(inputPath)).slice(0, argv.limit))
    }
  }

  const analyzeArguments = await Promise.all(inputPromises)
  console.log(`✅  Done processing inputs`)
  const collated = analyzer.collate(...analyzeArguments)
  const collatedPath = `${argv.outputWithoutExt}.collated.json`
  console.log(`✅  Collated ${collated.length} results`)
  fs.writeFileSync(collatedPath, JSON.stringify(collated, null, 2))
  return collated
}

async function runAnalyze(argv) {
  const outputPath = getFullPath(argv.output)
  const outputExt = path.extname(outputPath)
  argv.outputWithoutExt = outputPath.replace(new RegExp(`${outputExt}$`), '')

  const analyzer = require(getFullPath(argv.analyzer))
  const collated = await getCollatedResults(argv, analyzer)
  const results = await analyzer.analyze(collated)
  console.log(`✅  Done analyzing`)
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
}

const args = yargs
  .option('analyzer', {
    alias: 'a',
    type: 'string',
    required: true,
  })
  .option('split', {
    alias: 's',
    type: 'number',
    default: os.cpus().length || 1,
  })
  .option('collated', {
    type: 'boolean',
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    default: Infinity,
  })
  .option('input', {
    alias: 'i',
    type: 'array',
    required: true,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    required: true,
  })
  .argv

runAnalyze(args)

