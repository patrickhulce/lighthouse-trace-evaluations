#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const METRIC_NAMES = require('../lib/analyzers/analyzer').METRIC_NAMES

const ANALYSIS_FILE = process.argv[2] || 'analysis.json'
const fileContent = JSON.parse(fs.readFileSync(ANALYSIS_FILE))
const property = process.argv[3] || 'stddevToMean'

const output = [
  ['URL'].concat(METRIC_NAMES.map(s => _.startCase(s))),
]

for (const site of fileContent.sites) {
  const entry = [site.url]
  for (const metricName of METRIC_NAMES) {
    const value = site[metricName][property]
    entry.push(value || '')
  }

  output.push(entry)
}

console.log(output.map(row => row.join(',')).join('\n'))
