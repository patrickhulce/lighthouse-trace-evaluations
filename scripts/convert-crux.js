#!/usr/bin/env node

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const URL = require('url').URL

const CRUX_INPUT_FILE = process.argv[2] || './out-results/crux.json'
const SRC_OF_TRUTH_FILE = process.argv[3] || './out-results/analysis-multi-run-wpt.json'
const OUTPUT_AS_CSV = process.env.CSV

const rawContents = fs.readFileSync(CRUX_INPUT_FILE, 'utf8')
const srcOfTruthContents = JSON.parse(fs.readFileSync(SRC_OF_TRUTH_FILE, 'utf8'))
const rows = rawContents.split('\n').filter(Boolean).map(s => JSON.parse(s))

function findRowsForSite(site) {
  const parsedURL = new URL(site.url)

  let matchedRows = rows.filter(row => row.origin === parsedURL.origin)
  if (!matchedRows.length && parsedURL.protocol === 'http:') {
    parsedURL.protocol = 'https:'
    matchedRows = rows.filter(row => row.origin === parsedURL.origin)
  }

  return matchedRows
}

function createSiteData(url) {
  return {
    url,
    load: {median: 1},
    firstContentfulPaint: {median: 1},
    firstMeaningfulPaint: {median: 1},
    timeToFirstInteractive: {median: 1},
    timeToConsistentlyInteractive: {median: 1},
    bins: [],
  }
}

function cleanBinDatapoint(row) {
  const keysToBring = Object.keys(row).filter(k => /(bin|f0)/.test(k))
  const out = {}
  for (const srcKey of keysToBring) {
    const dstKey = srcKey.replace(/.*bin_/, '').replace(/f0_/, 'density')
    out[dstKey] = Number(row[srcKey])
  }

  return out
}

function clipHighValueBins(bins) {
  const highValueBins = bins.filter(bin => bin.end > 120000)
  const lowValueBins = bins.filter(bin => !highValueBins.includes(bin))
  return lowValueBins.concat({start: 120000, end: 125000, density: _.sumBy(highValueBins, 'density')})
}

function findValueFromBins(bins, targetDensity) {
  let accumulated = 0
  const medianBin = bins.find(bin => {
    if (accumulated + bin.density >= targetDensity) {
      return true
    }

    accumulated += bin.density
    return false
  })

  const weightOfLeft = (targetDensity - accumulated) / medianBin.density
  const weightOfRight = 1 - weightOfLeft
  return medianBin.start * weightOfLeft + medianBin.end * weightOfRight
}

function findPercentileFromBins(bins, targetValue) {
  let accumulated = 0
  const targetBin = bins.find(bin => {
    if (targetValue <= bin.end) {
      const interpolatedPercent = (targetValue - bin.start) / (bin.end - bin.start)
      accumulated += bin.density * interpolatedPercent
      return true
    }

    accumulated += bin.density
    return false
  })

  return accumulated / _.sumBy(bins, 'density')
}

const sites = []
for (const srcSite of srcOfTruthContents.sites) {
  const rowsForSite = findRowsForSite(srcSite)
  if (!rowsForSite.length) continue
  const site = createSiteData(srcSite.url)
  for (const row of rowsForSite) {
    site.bins.push(cleanBinDatapoint(row))
  }

  site.bins = _.sortBy(site.bins, 'start')
  sites.push(site)
}

const fcpRows = []
for (const site of sites) {
  site.bins = clipHighValueBins(site.bins)
  const srcSite = srcOfTruthContents.sites.find(s => s.url === site.url)
  const totalDensity = _.sumBy(site.bins, 'density')
  const weightedByDensity = _.sum(site.bins.map(bin => (bin.start + bin.end) / 2 * bin.density))

  const average = weightedByDensity / totalDensity
  const median = findValueFromBins(site.bins, totalDensity / 2)
  const truth = srcSite.firstContentfulPaint.median
  const percentile = 1 - findPercentileFromBins(site.bins, truth)
  site.firstContentfulPaint = {median, average, percentile, truth}
  fcpRows.push({url: site.url, ...site.firstContentfulPaint})
}

if (OUTPUT_AS_CSV) {
  console.log('URL,CrUX Median,CrUX Average,CrUX Percentile of WPT Median,WPT Median')
  console.log(fcpRows.map(row => Object.values(row).join(',')).join('\n'))
} else {
  console.log(JSON.stringify({sites}, null, 2))
}

