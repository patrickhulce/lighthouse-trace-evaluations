#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const Analyzer = require('../lib/analyzers/analyzer')

const ANALYSIS_FILE = process.argv[2] || 'analysis.json'
const fileContent = JSON.parse(fs.readFileSync(ANALYSIS_FILE))
const property = process.argv[3] || 'stddevToMean'
const METRIC_NAMES = /lantern/.test(ANALYSIS_FILE)
  ? Analyzer.LANTERN_METRIC_NAMES
  : Analyzer.METRIC_NAMES

const output = [
  ['URL'].concat(METRIC_NAMES.map(s => _.startCase(s))),
]

for (const site of fileContent.sites) {
  const entry = [site.url]
  for (const metricName of METRIC_NAMES) {
    const value = site[metricName] && site[metricName][property]
    entry.push(value || '')
  }

  output.push(entry)
}

console.log(output.map(row => row.join(',')).join('\n'))
