#!/usr/bin/env node

const path = require('path')
const LH = path.join(__dirname, '../../lighthouse')

const INPUT =
  process.argv[2] || 'plots/out-tmp/out-0-300/www.telegraph.co.uk-./2017-12-07T23.55.56.753Z'
const FULL_INPUT_PATH = path.join(LH, INPUT)

console.time('require lighthouse')
const PredictivePerf = require(path.join(LH, 'lighthouse-core/audits/predictive-perf'))
const Runner = require(path.join(LH, 'lighthouse-core/runner'))
console.timeEnd('require lighthouse')

console.time('require artifacts')
const traces = {defaultPass: require(path.join(FULL_INPUT_PATH, 'assets-0.trace.json'))}
const devtoolsLogs = {defaultPass: require(path.join(FULL_INPUT_PATH, 'assets-0.devtoolslog.json'))}
const artifacts = {traces, devtoolsLogs, ...Runner.instantiateComputedArtifacts()}
console.timeEnd('require artifacts')

;(async () => {
  console.time('predict perf')
  const result = await PredictivePerf.audit(artifacts)
  console.timeEnd('predict perf')
  console.log(result)
})().catch(console.error)
