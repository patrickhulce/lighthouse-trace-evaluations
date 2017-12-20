const _ = require('lodash')
const stats = require('simple-statistics')
const Analyzer = require('./analyzer')

const CORRELATION_METRICS = ['correlation', 'spearman', 'error']

class MetricCorrelationAnalyzer extends Analyzer {
  static getProcessors() {
    return [require('../processors/metrics-processor')]
  }

  static collate(runs) {
    return _.groupBy(runs, 'url')
  }

  static async analyze(collatedData) {
    const sites = []

    let numberOfSamples
    _.forEach(collatedData, (runs, url) => {
      runs = runs.filter(run => _.values(run).every(Boolean))

      if (!numberOfSamples) numberOfSamples = runs.length
      if (runs.length < numberOfSamples - 1) {
        console.warn(`${url} had ${runs.length} runs but ${numberOfSamples} were expected`)
        if (runs.length < numberOfSamples / 2) return
      }

      const site = {url}
      Analyzer.METRIC_NAMES.forEach(metricName => {
        const values = _.map(runs, metricName).sort()
        site[metricName] = {
          mean: stats.mean(values),
          median: stats.median(values),
          max: stats.max(values),
          min: stats.min(values),
          stddev: stats.standardDeviation(values),
          values,
        }

        site[metricName].stddevToMean = site[metricName].stddev / site[metricName].mean
      })

      sites.push(site)
    })

    const doAnalysis = async (metricName, pickValue, pickTarget) => {
      if (!pickTarget) pickTarget = metricData => metricData.median

      const dataset = []
      sites.forEach(site => {
        dataset.push({
          x: pickValue(site[metricName]),
          y: pickTarget(site[metricName]),
        })
      })

      const options = {target: 'y', predictors: ['x'], forceOriginal: true}
      const analysis = await Analyzer.regressionAnalysis(dataset, options)
      return _.pick(analysis, ['correlation', 'spearman', 'error'])
    }

    const averageMultipleAnalysis = async (metricName, pickValue, pickTarget) => {
      const runs = []
      for (let i = 0; i < 100; i++) {
        runs.push(await doAnalysis(metricName, pickValue, pickTarget))
      }

      const output = {}
      CORRELATION_METRICS.forEach(name => {
        const values = _.map(runs, name)
        output[name] = stats.mean(values)
        output[name + '95th'] = stats.quantile(values, name === 'error' ? 0.95 : 0.05)
      })

      return output
    }

    const metrics = {}
    for (const metricName of Analyzer.METRIC_NAMES) {
      let worstCaseI = 0
      metrics[metricName] = {
        meanMedianSpread: stats.mean(
          _.map(sites, site => Math.abs(site[metricName].median - site[metricName].mean))
        ),
        spread: stats.median(_.map(sites, site => site[metricName].max - site[metricName].min)),
        stddev: stats.mean(_.map(sites, site => site[metricName].stddev)),
        worstCase: await doAnalysis(
          metricName,
          metricData => (worstCaseI++, worstCaseI % 2 === 0 ? metricData.min : metricData.max),
          metricData => worstCaseI % 2 === 0 ? metricData.max : metricData.min,
        ),
        bestCase: await doAnalysis(metricName, metricData =>
          _.minBy(metricData.values.filter(x => x !== metricData.median), value =>
            Math.abs(metricData.median - value)
          )
        ),
        apparentAverageCase: await averageMultipleAnalysis(
          metricName,
          metricData => _.sample(metricData.values),
          metricData => _.sample(metricData.values)
        ),
        averageCase: await averageMultipleAnalysis(metricName, metricData =>
          _.sample(metricData.values)
        ),
        average3Case: await averageMultipleAnalysis(metricName, metricData =>
          stats.median([
            _.sample(metricData.values),
            _.sample(metricData.values),
            _.sample(metricData.values),
          ])
        ),
        average5Case: await averageMultipleAnalysis(metricName, metricData =>
          stats.median([
            _.sample(metricData.values),
            _.sample(metricData.values),
            _.sample(metricData.values),
            _.sample(metricData.values),
            _.sample(metricData.values),
          ])
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
