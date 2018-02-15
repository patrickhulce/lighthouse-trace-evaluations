#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const URL = require('url').URL
const chalk = require('chalk')

const LANTERN_ANALYSIS_FILE = process.argv[2] || './analysis.json'
const BASELINE_FILE = process.argv[3] || './out-results/xpa-multi-correl-wpt-lantern.json'

const data = JSON.parse(fs.readFileSync(LANTERN_ANALYSIS_FILE, 'utf8'))
const baselineData = BASELINE_FILE && JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))

function round(number, granularity = 1000) {
  return Math.round(number * granularity) / granularity;
}

const vars ={0: '', 1: 'x', 2: 'y'}
function getSummaries(data) {
  return _.map(data, (set, url) => {
    if (!/at (99|90)%/.test(set.name)) return;
    const equation = Object.keys(set.coefficients).map((k, i) => `${round(set.coefficients[k])}${vars[i]}`).join(' + ')
    return {
      name: set.name,
      spearman: round(set.spearman),
      error: round(set.error),
      equation,
    }
  }).filter(Boolean)
}

function printSummary(summary, baseline) {
  console.log(summary.name)
  if (baseline) {
    let spearmanDiff = round(summary.spearman - baseline.spearman)
    let errorDiff = round(baseline.error - summary.error)
    spearmanDiff = spearmanDiff > 0 ? chalk.green(spearmanDiff) : chalk.red(spearmanDiff)
    errorDiff = errorDiff > 0 ? chalk.green(errorDiff) : chalk.red(errorDiff)
    console.log(`  ${summary.spearman} ${spearmanDiff} : ${summary.error}% ${errorDiff}`)
    console.log(`  ${summary.equation}`)
    return
  }

  console.log(`  ${summary.spearman} : ${summary.error}%`)
  console.log(`  ${summary.equation}`)
}

const baselineSummaries = (baselineData && getSummaries(baselineData)) || []
getSummaries(data).forEach((summary, i) => {
  printSummary(summary, baselineSummaries[i])
})
