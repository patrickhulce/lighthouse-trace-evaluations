const _ = require('lodash')
const stats = require('simple-statistics')
const Analyzer = require('./analyzer')

class FastModeAccuracyAnalyzer extends Analyzer {
  static getProcessors() {
    return [
      require('../processors/metrics-processor'),
      require('../processors/fast-mode-processor'),
    ]
  }

  static _getCollatedForMultiRun(results) {
    const sites = []
    const grouped = _.groupBy(results, site => site.url)
    _.forEach(grouped, group => {
      sites.push({
        ...group[0],
        optimisticFCP: stats.median(group.map(s => s.optimisticFCP)),
        pessimisticFCP: stats.median(group.map(s => s.pessimisticFCP)),
        optimisticFMP: stats.median(group.map(s => s.optimisticFMP)),
        pessimisticFMP: stats.median(group.map(s => s.pessimisticFMP)),
        optimisticTTCI: stats.median(group.map(s => s.optimisticTTCI)),
        pessimisticTTCI: stats.median(group.map(s => s.pessimisticTTCI)),
        roughEstimateOfFCP: stats.median(group.map(s => s.roughEstimateOfFCP)),
        roughEstimateOfFMP: stats.median(group.map(s => s.roughEstimateOfFMP)),
        roughEstimateOfTTCI: stats.median(group.map(s => s.roughEstimateOfTTCI)),
      })
    })

    return sites
  }

  static collate(throttledResults, unthrottledResults) {
    return Analyzer.joinByUrl({
      unthrottled: FastModeAccuracyAnalyzer._getCollatedForMultiRun(unthrottledResults),
      throttled: throttledResults,
    })
  }

  static async analyze(collatedData) {
    const reports = []

    const withRejectionRate = async (options, outlierRejectionRate) => {
      const name = `${options.name} at ${(1 - outlierRejectionRate) * 100}%`
      const newOptions = Object.assign({}, options, {outlierRejectionRate})
      const results = await Analyzer.regressionAnalysis(collatedData, newOptions)
      return Object.assign(results, {name})
    }

    const fcpOptions = {
      name: 'FCP',
      target: 'throttled.firstContentfulPaint',
      predictors: ['unthrottled.optimisticFCP', 'unthrottled.pessimisticFCP'],
    }

    const fmpOptions = {
      name: 'FMP',
      target: 'throttled.firstMeaningfulPaint',
      predictors: ['unthrottled.optimisticFMP', 'unthrottled.pessimisticFMP'],
    }

    const ttciOptions = {
      name: 'TTCI',
      target: 'throttled.timeToConsistentlyInteractive',
      predictors: ['unthrottled.optimisticTTCI', 'unthrottled.pessimisticTTCI'],
    }

    reports.push(await withRejectionRate(fcpOptions, 0))
    reports.push(await withRejectionRate(fcpOptions, .01))
    reports.push(await withRejectionRate(fcpOptions, .05))
    reports.push(await withRejectionRate(fcpOptions, .10))

    reports.push(await withRejectionRate(fmpOptions, 0))
    reports.push(await withRejectionRate(fmpOptions, .01))
    reports.push(await withRejectionRate(fmpOptions, .05))
    reports.push(await withRejectionRate(fmpOptions, .10))

    reports.push(await withRejectionRate(ttciOptions, 0))
    reports.push(await withRejectionRate(ttciOptions, .01))
    reports.push(await withRejectionRate(ttciOptions, .05))
    reports.push(await withRejectionRate(ttciOptions, .10))


    return reports
  }
}

module.exports = FastModeAccuracyAnalyzer
