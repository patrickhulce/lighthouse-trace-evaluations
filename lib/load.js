const fs = require('fs')
const path = require('path')
const Runner = require('../../lighthouse/lighthouse-core/runner')

const LH_RESULTS_FILENAME = 'lighthouse.json'
const TRACE_ASSET_FILENAME = 'assets-0.trace.json'
const DEVTOOLSLOG_ASSET_FILENAME = 'assets-0.devtoolslog.json'

function traversePlotsFolder(folderPath) {
  const runs = []
  fs.readdirSync(folderPath).forEach(urlFolder => {
    const urlFolderPath = path.join(folderPath, urlFolder)
    if (!fs.statSync(urlFolderPath).isDirectory()) return

    fs.readdirSync(urlFolderPath).forEach(runFolder => {
      const runFolderPath = path.join(urlFolderPath, runFolder)
      if (!fs.statSync(runFolderPath).isDirectory()) return

      const tracePath = path.join(runFolderPath, TRACE_ASSET_FILENAME)
      if (!fs.existsSync(tracePath)) return

      runs.push({
        urlFolder,
        runFolder,
        path: runFolderPath,
      })
    })
  })

  return runs
}

const fileCache = new Map()
function loadAndParseFile(run, file) {
  const fullPath = path.join(run.path, file)
  if (fileCache.has(fullPath)) return fileCache.get(fullPath)

  let value
  try {
    value = JSON.parse(fs.readFileSync(fullPath))
  } catch (err) {
    value = null
  }

  fileCache.set(fullPath, value)
  return value
}

function loadArtifacts(run, options) {
  options = Object.assign({
    lhResults: true,
    devtoolsLogs: true,
    traces: true,
  }, options)

  let lhResults, devtoolsLogs, traces

  if (options.lhResults) {
    lhResults = loadAndParseFile(run, LH_RESULTS_FILENAME)
  }
  if (options.devtoolsLogs) {
    devtoolsLogs = loadAndParseFile(run, DEVTOOLSLOG_ASSET_FILENAME)
  }
  if (options.lhResults) {
    traces = loadAndParseFile(run, TRACE_ASSET_FILENAME)
  }

  return Object.assign({
    run,
    lhResults,
    traces: traces && {defaultPass: traces},
    devtoolsLogs: devtoolsLogs && {defaultPass: devtoolsLogs},
  }, Runner.instantiateComputedArtifacts());
}

module.exports = {traversePlotsFolder, loadArtifacts};
