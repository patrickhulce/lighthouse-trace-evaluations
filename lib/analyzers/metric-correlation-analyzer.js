const _ = require('lodash')
const stats = require('simple-statistics')
const Analyzer = require('./analyzer')

class MetricCorrelationAnalyzer extends Analyzer {
  static getProcessors() {
    return [
      require('../processors/metrics-processor'),
      require('../processors/metrics-processor'),
    ]
  }

  static collate(runA, runB) {
    return Analyzer.joinByUrl({runA, runB})
  }

  static async analyzeOnce(data, options) {
    let coefficients = await Analyzer.regression(data, options)
    data = Analyzer.addPredictionData(data, coefficients, options)

    const numTotal = data.length
    const sortedByError = _.sortBy(data, 'signedErr')
    const dataWithoutTail = sortedByError.slice(
      Math.ceil(data.length * options.outlierRejectionRate / 2),
      Math.floor(data.length * (1 - options.outlierRejectionRate / 2))
    )

    const numTail = numTotal - dataWithoutTail.length
    coefficients = await Analyzer.regression(dataWithoutTail, options)
    data = Analyzer.addPredictionData(dataWithoutTail, coefficients, options)
      .filter(item => Number.isFinite(item.y) && Number.isFinite(item.yhat))

    const numFailed = numTotal - numTail - data.length
    const correlation = stats.sampleCorrelation(data.map(x => x.yhat), data.map(x => x.y))
    const spearman = stats.sampleCorrelation(data.map(x => x.yRank), data.map(x => x.yhatRank))
    const error = stats.mean(data.map(x => x.err / x.y)) * 100
    return {data, numTotal, numTail, numFailed, coefficients, correlation, spearman, error}
  }

  static async analyze(collatedData) {
    const reports = []

    const withRejectionRate = async (options, outlierRejectionRate) => {
      const name = `${options.name} at ${(1 - outlierRejectionRate) * 100}%`
      const newOptions = Object.assign({}, options, {outlierRejectionRate})
      const results = await MetricCorrelationAnalyzer.analyzeOnce(collatedData, newOptions)
      return Object.assign(results, {name})
    }

    const fcpOptions = {
      name: 'FCP',
      target: 'runA.firstContentfulPaint',
      predictors: ['runB.firstContentfulPaint'],
    }

    const fmpOptions = {
      name: 'FMP',
      target: 'runA.firstMeaningfulPaint',
      predictors: ['runB.firstMeaningfulPaint'],
    }

    const ttciOptions = {
      name: 'TTCI',
      target: 'runA.timeToConsistentlyInteractive',
      predictors: ['runB.timeToConsistentlyInteractive'],
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

module.exports = MetricCorrelationAnalyzer
