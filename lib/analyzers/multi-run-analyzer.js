const _ = require('lodash')
const stats = require('simple-statistics')
const Analyzer = require('./analyzer')

const METRIC_NAMES = [
  'load',
  'firstContentfulPaint',
  'firstMeaningfulPaint',
  'timeToFirstInteractive',
  'timeToConsistentlyInteractive',
]

class MetricCorrelationAnalyzer extends Analyzer {
  static getProcessors() {
    return [require('../processors/metrics-processor')]
  }

  static collate(runs) {
    return _.groupBy(runs, 'url')
  }

  static async analyze(collatedData) {
    const sites = []

    _.forEach(collatedData, (runs, url) => {
      const site = {url}
      METRIC_NAMES.forEach(metricName => {
        const values = _.map(runs, metricName).sort()
        site[metricName] = {
          mean: stats.mean(values),
          median: stats.median(values),
          max: stats.max(values),
          min: stats.min(values),
          stddev: stats.standardDeviation(values),
          values,
        }
      })

      sites.push(site)
    })

    const doAnalysis = async (metricName, pickValue) => {
      const dataset = []
      sites.forEach(site => {
        dataset.push({
          x: pickValue(site[metricName]),
          y: site[metricName].median,
        })
      })

      const options = {target: 'y', predictors: ['x']}
      const analysis = await Analyzer.regressionAnalysis(dataset, options)
      return _.pick(analysis, ['correlation', 'spearman', 'error'])
    }

    const averageMultipleAnalysis = async (metricName, pickValue, n) => {
      const runs = []
      for (let i = 0; i < n; i++) {
        runs.push(await doAnalysis(metricName, pickValue))
      }

      return {
        correlation: stats.mean(_.map(runs, run => run.correlation)),
        spearman: stats.mean(_.map(runs, run => run.spearman)),
        error: stats.mean(_.map(runs, run => run.error)),
      }
    }

    const metrics = {}
    for (const metricName of METRIC_NAMES) {
      metrics[metricName] = {
        meanMedianRange: stats.mean(
          _.map(sites, site => Math.abs(site[metricName].median - site[metricName].mean))
        ),
        spread: stats.mean(_.map(sites, site => site[metricName].max - site[metricName].min)),
        stddev: stats.mean(_.map(sites, site => site[metricName].stddev)),
        worstCase: await doAnalysis(metricName, metricData =>
          _.maxBy(metricData.values, value => Math.abs(metricData.median - value))
        ),
        bestCase: await doAnalysis(metricName, metricData =>
          _.minBy(metricData.values.filter(x => x !== metricData.median), value =>
            Math.abs(metricData.median - value)
          )
        ),
        randomCase: await doAnalysis(metricName, metricData => _.sample(metricData.values)),
        averageCase: await averageMultipleAnalysis(
          metricName,
          metricData => _.sample(metricData.values),
          50
        ),
        average3Case: await averageMultipleAnalysis(
          metricName,
          metricData =>
            stats.median([
              _.sample(metricData.values),
              _.sample(metricData.values),
              _.sample(metricData.values),
            ]),
          50
        ),
        average5Case: await averageMultipleAnalysis(
          metricName,
          metricData =>
            stats.median([
              _.sample(metricData.values),
              _.sample(metricData.values),
              _.sample(metricData.values),
              _.sample(metricData.values),
              _.sample(metricData.values),
            ]),
          50
        ),
      }
    }

    return {
      metrics,
      sites,
    }
  }
}

module.exports = MetricCorrelationAnalyzer
