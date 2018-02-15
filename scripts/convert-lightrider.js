#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const URL = require('url').URL

const LIGHTRIDER_INPUT_FILE = process.argv[2] || './out-results/lightrider-results.json'
const OUTPUT_FILE = process.argv[3] || './out-results/collated-multi-run-lightrider.json'

const data = JSON.parse(fs.readFileSync(LIGHTRIDER_INPUT_FILE, 'utf8'))

_.forEach(data, (runs, url) => {
  runs.forEach(site => {
    Object.assign(site, {
      url,
      load: 0,
      firstContentfulPaint: 0,
      firstMeaningfulPaint: 0,
      timeToFirstInteractive: 0,
      timeToConsistentlyInteractive: 0,
    })
  })
})

console.log(JSON.stringify(data, null, 2))

