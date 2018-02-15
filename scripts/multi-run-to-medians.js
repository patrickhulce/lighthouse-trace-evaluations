#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const URL = require('url').URL
const stats = require('simple-statistics')

const WPT_FILE = process.argv[2] || './out-results/collated-multi-run-wpt.json'
const OUTPUT_FILE = process.argv[3] || './out-results/collated-medians-wpt.json'

const data = JSON.parse(fs.readFileSync(WPT_FILE, 'utf8'))

const output = [];

_.forEach(data, (runs, url) => {
  const fcp = runs.map(site => site.firstContentfulPaint);
  const fmp = runs.map(site => site.firstMeaningfulPaint);
  const ttci = runs.map(site => site.timeToConsistentlyInteractive);
  if (!fcp || !fmp) return;

  output.push({
    url,
    finalUrl: url,
    load: 0,
    firstContentfulPaint: stats.median(fcp),
    firstMeaningfulPaint: stats.median(fmp),
    timeToFirstInteractive: 0,
    timeToConsistentlyInteractive: stats.median(ttci),
  })
})

console.log(JSON.stringify(output, null, 2))

