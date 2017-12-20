#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const Analyzer = require('../lib/analyzers/analyzer')

const ANALYSIS_FILE = process.argv[2] || 'analysis.json'
const fileContent = JSON.parse(fs.readFileSync(ANALYSIS_FILE))
const METRIC_NAMES = /lantern/.test(ANALYSIS_FILE)
  ? Analyzer.LANTERN_METRIC_NAMES
  : Analyzer.METRIC_NAMES

const normalizedValues = [['URL'].concat(METRIC_NAMES.map(s => _.startCase(s)))]

for (const site of fileContent.sites) {
  for (let i = 0; i < site.load.values.length; i++) {
    const entry = [site.url]
    for (const metricName of METRIC_NAMES) {
      const value = site[metricName].values[i]
      const normalizedValue = value / site[metricName].median
      entry.push(value ? normalizedValue : '')
    }

    normalizedValues.push(entry)
  }
}

console.log(normalizedValues.map(row => row.join(',')).join('\n'))
