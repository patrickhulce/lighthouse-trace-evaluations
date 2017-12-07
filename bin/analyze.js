#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')

const _ = require('lodash')
const yargs = require('yargs')
const Promise = require('bluebird')
const Progress = require('cli-progress')

const load = require('../lib/load')
const runProcess = require('../lib/process-bin').run
const cleanupTmpFiles = require('../lib/process-bin').cleanupTmp

function getFullPath(filePath) {
  return path.resolve(process.cwd(), filePath)
}

function cleanupOnExit() {
  process.on('SIGINT', async () => {
    cleanupTmpFiles()
    process.exit(1)
  })
}

async function processInputs(processors, argv) {
  let totalChunks = 0
  let tickProgress = () => {}
  const inputPromises = []
  const concurrency = Math.ceil(argv.concurrency / argv.input.length)
  for (const inputPath of argv.input) {
    const processor = processors[argv.input.indexOf(inputPath)]
    if (fs.statSync(inputPath).isDirectory()) {
      const runs = load.traversePlotsFolder(inputPath)
      const numPerChunk = argv.chunkSize
      const numToProcess = Math.min(argv.limit, runs.length)
      const numChunks = Math.ceil(numToProcess / numPerChunk)

      const chunks = [];
      for (let i = 0; i < numChunks; i++) {
        const input = runs.slice(i * numPerChunk, (i + 1) * numPerChunk)
        chunks.push(input)
      }

      const resultPromise = Promise
        .map(chunks, input => runProcess({processor, input, force: argv.force}).then(result => {
          tickProgress()
          return result
        }), {concurrency})
        .then(_.flatten)
      inputPromises.push(resultPromise)
      totalChunks += chunks.length
    } else {
      const fileContent = fs.readFileSync(inputPath)
      const fileAsJson = JSON.parse(fileContent)
      inputPromises.push(fileAsJson.slice(0, argv.limit))
    }
  }

  const progress = new Progress.Bar({
    etaBuffer: Math.ceil(totalChunks / 10),
  }, Progress.Presets.shades_classic)
  tickProgress = () => progress.increment()
  progress.start(totalChunks)
  const analyzeArguments = await Promise.all(inputPromises)
  progress.stop()

  console.log(`✅  Done processing inputs`)
  return analyzeArguments
}

async function getCollatedResults(argv, analyzer) {
  if (argv.collated) {
    if (argv.input.length !== 1) throw new Error('Can only specify one collated input')
    const collated = JSON.parse(fs.readFileSync(getFullPath(argv.input[0]), 'utf-8'))
    console.log(`✅  Loaded ${collated.length || Object.keys(collated).length} collated results`)
    return collated
  }

  const processors = analyzer.getProcessors()
  if (processors.length !== argv.input.length) {
    throw new Error(`Expected ${processors.length} input but received ${argv.input.length}`)
  }

  const analyzeArguments = await processInputs(processors, argv)
  const collated = analyzer.collate(...analyzeArguments)
  const collatedPath = `${argv.outputWithoutExt}.collated.json`
  console.log(`✅  Collated ${collated.length || Object.keys(collated).length} results`)
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
  .option('chunkSize', {
    type: 'number',
    default: 5,
  })
  .option('concurrency', {
    alias: 'j',
    type: 'number',
    default: os.cpus().length || 1,
  })
  .option('collated', {
    type: 'boolean',
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
    type: 'array',
    required: true,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    required: true,
  })
  .argv

cleanupOnExit()
runAnalyze(args).catch(console.error)

