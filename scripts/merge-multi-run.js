#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const METRIC_NAMES = require('../lib/analyzers/analyzer').METRIC_NAMES

const RUN_A = process.argv[2]
const RUN_B = process.argv[3]
const fileContentA = JSON.parse(fs.readFileSync(RUN_A))
const fileContentB = JSON.parse(fs.readFileSync(RUN_B))

const siteData = new Map()
function indexSiteData(sites, key, metrics) {
  for (const site of sites) {
    const data = siteData.get(site.url) || {}
    for (const [dstName, srcName] of metrics.entries()) {
      data[`${key}.${dstName}`] = site[srcName].median
    }
    siteData.set(site.url, data)
  }
}

const defaultMetrics = new Map(METRIC_NAMES.map(x => [x, x]))
const lanternMetrics = new Map([
  ['firstContentfulPaint', 'roughEstimateOfFCP'],
  ['firstMeaningfulPaint', 'roughEstimateOfFMP'],
  ['timeToConsistentlyInteractive', 'roughEstimateOfTTCI'],
])

indexSiteData(fileContentA.sites, 'runA', /lantern|lightrider/.test(RUN_A) ? lanternMetrics : defaultMetrics)
indexSiteData(fileContentB.sites, 'runB', /lantern|lightrider/.test(RUN_B) ? lanternMetrics : defaultMetrics)

const collatedOutput = Array.from(siteData.entries())
  .map(item => ({url: item[0], ...item[1]}))
  .filter(item => item['runA.firstContentfulPaint'] && item['runB.firstContentfulPaint'])
console.log(JSON.stringify(collatedOutput, null, 2))
