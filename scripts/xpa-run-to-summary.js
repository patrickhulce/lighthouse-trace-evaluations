#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')

const ANALYSIS_FILE = process.argv[2] || 'analysis.json'
const RUN_A_NAME = process.argv[3] || 'Run A'
const RUN_B_NAME = process.argv[4] || 'Run B'
const fileContent = JSON.parse(fs.readFileSync(ANALYSIS_FILE))
const METRIC_NAMES = ['firstContentfulPaint', 'firstMeaningfulPaint', 'timeToConsistentlyInteractive']


function getDisplayName(metric) {
  return _.startCase(metric).replace(/[a-z]+\s*/g, '')
}

const normalizedValues = [
  _.flatten(['URL'].concat(METRIC_NAMES.map(metricName => {
    const metricDisplay = getDisplayName(metricName)
    return [`${RUN_A_NAME} ${metricDisplay}`, `${RUN_B_NAME} ${metricDisplay}`]
  })))
]

for (const site of fileContent[0].data) {
  const entry = [site.url]
  for (const metricName of METRIC_NAMES) {
    entry.push(site[`runA.${metricName}`], site[`runB.${metricName}`])
  }

  normalizedValues.push(entry)
}

console.log(normalizedValues.map(row => row.join(',')).join('\n'))
