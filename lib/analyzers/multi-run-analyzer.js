const _ = require('lodash')
const stats = require('simple-statistics')
const Analyzer = require('./analyzer')

const CORRELATION_METRICS = ['correlation', 'spearman', 'error']

class MultiRunAnalyzer extends Analyzer {
  static getProcessors() {
    return [require('../processors/metrics-processor')]
  }

  static collate(runs) {
    return _.groupBy(runs, 'url')
  }

  static get METRIC_NAMES() {
    return Analyzer.METRIC_NAMES
  }

  static async analyze(collatedData) {
    const sites = []

    let numberOfSamples
    _.forEach(collatedData, (runs, url) => {
      runs = runs.filter(run => _.values(run).every(x => x || x === 0))

      if (!numberOfSamples) numberOfSamples = runs.length
      if (runs.length < numberOfSamples - 1) {
        console.warn(`${url} had ${runs.length} runs but ${numberOfSamples} were expected`)
        if (runs.length < numberOfSamples / 2) return
      }

      const site = {url}
      this.METRIC_NAMES.forEach(metricName => {
        const values = _.map(runs, metricName).sort()
        site[metricName] = {
          mean: stats.mean(values),
          median: stats.median(values),
          max: stats.max(values),
          min: stats.min(values),
          stddev: stats.sampleStandardDeviation(values),
          values,
        }

        site[metricName].stddevToMean = site[metricName].stddev / site[metricName].mean
      })

      sites.push(site)
    })

    const doAnalysis = async (metricName, pickValue, pickTarget, includeData) => {
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
      const keysToKeep = ['correlation', 'spearman', 'error']
      if (includeData) keysToKeep.push('data')
      return _.pick(analysis, keysToKeep)
    }

    const averageMultipleAnalysis = async (metricName, pickValue, pickTarget) => {
      const runs = []
      for (let i = 0; i < 100; i++) {
        runs.push(await doAnalysis(metricName, pickValue, pickTarget, true))
      }

      const values = []
      sites.forEach((site, index) => {
        const siteValues = runs.map(run => run.data[index].x)
        values.push({
          stddev: stats.sampleStandardDeviation(siteValues),
          mean: stats.mean(siteValues),
        })
      })

      const output = {
        stddev: stats.mean(values.map(x => x.stddev)),
        stddevToMean: stats.mean(values.map(x => x.stddev / x.mean)),
      }
      CORRELATION_METRICS.forEach(name => {
        const values = _.map(runs, name)
        output[name] = stats.mean(values)
        output[name + '95th'] = stats.quantile(values, name === 'error' ? 0.95 : 0.05)
      })

      return output
    }

    const metrics = {}
    for (const metricName of this.METRIC_NAMES) {
      let worstCaseI = 0
      metrics[metricName] = {
        meanMedianSpread: stats.mean(
          _.map(sites, site => Math.abs(site[metricName].median - site[metricName].mean))
        ),
        spread: stats.median(_.map(sites, site => site[metricName].max - site[metricName].min)),
        stddev: stats.mean(_.map(sites, site => site[metricName].stddev)),
        stddevToMean: stats.mean(_.map(sites, site => site[metricName].stddevToMean)),
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

module.exports = MultiRunAnalyzer
