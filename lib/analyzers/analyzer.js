const _ = require('lodash')
const stats = require('simple-statistics')
const LinearRegression = require('shaman').LinearRegression

class Analyzer {
  static getProcessors() {
    throw new Error('unimplemented')
  }
  static collate() {
    throw new Error('unimplemented')
  }
  static async analyze() {
    throw new Error('unimplemented')
  }

  static joinByUrl(datasets) {
    const joined = {}
    _.forEach(datasets, (data, subkey) => {
      _.forEach(data, item => {
        joined[item.url] = joined[item.url] || {}
        _.forEach(item, (value, key) => {
          joined[item.url][`${subkey}.${key}`] = value
        })
      })
    })

    return _.values(joined)
  }

  static addPredictionData(data, coefficients, options) {
    const augmentedData = data.map(item => {
      const y = item[options.target]
      let yhat = coefficients.intercept
      for (const predictorName of options.predictors) {
        yhat += coefficients[predictorName] * item[predictorName]
      }

      return Object.assign({}, item, {
        y,
        yhat,
        signedErr: y - yhat,
        err: Math.abs(y - yhat),
        errAsPercent: Math.abs(y - yhat) / y,
      })
    })

    const sortedByY = _.sortBy(augmentedData, 'y')
    const sortedByYhat = _.sortBy(augmentedData, 'yhat')
    augmentedData.forEach(item => {
      item.yRank = sortedByY.indexOf(item) + 1
      item.yhatRank = sortedByYhat.indexOf(item) + 1
    })

    return augmentedData
  }

  static async regression(data, options) {
    if (options.forceOriginal) {
      if (options.predictors.length !== 1) {
        throw new Error('Cannot force original with more than 1 predictor')
      }

      const coefficients = {intercept: 0}
      coefficients[options.predictors[0]] = 1
      return coefficients
    }

    const X = []
    const Y = []

    for (const item of data) {
      const predictors = []
      for (const key of options.predictors) {
        predictors.push(item[key])
      }

      const y = item[options.target]
      if (predictors.some(x => !Number.isFinite(x)) || !Number.isFinite(y)) continue
      X.push(predictors)
      Y.push(y)
    }

    return new Promise((resolve, reject) => {
      const lr = new LinearRegression(X, Y)
      lr.train(err => {
        if (err) {
          return reject(err)
        }

        const coefficients = {intercept: lr.theta.elements[0][0]}
        for (let i = 0; i < options.predictors.length; i++) {
          const predictorName = options.predictors[i]
          coefficients[predictorName] = lr.theta.elements[i + 1][0]
        }

        resolve(coefficients)
      })
    })
  }

  /**
   * @param {Array} data
   * @param {AnalyzerRegressionOptions} options
   * @return {RegressionAnalysis}
   */
  static async regressionAnalysis(data, options) {
    const numTotal = data.length
    let numTail = 0

    let coefficients = await Analyzer.regression(data, options)
    data = Analyzer.addPredictionData(data, coefficients, options)
    data = data.filter(
      item =>
        options.predictors.every(predictor => Number.isFinite(item[predictor])) &&
        Number.isFinite(item.y) &&
        item.y
    )

    if (options.outlierRejectionRate) {
      const sortedByError = _.sortBy(data, 'signedErr')
      const dataWithoutTail = sortedByError.slice(
        Math.ceil(data.length * options.outlierRejectionRate / 2),
        Math.floor(data.length * (1 - options.outlierRejectionRate / 2))
      )

      numTail = numTotal - dataWithoutTail.length
      coefficients = await Analyzer.regression(dataWithoutTail, options)
      data = Analyzer.addPredictionData(dataWithoutTail, coefficients, options).filter(
        item => Number.isFinite(item.y) && Number.isFinite(item.yhat)
      )
    }

    const numFailed = numTotal - numTail - data.length
    const correlation = stats.sampleCorrelation(data.map(x => x.yhat), data.map(x => x.y))
    const spearman = stats.sampleCorrelation(data.map(x => x.yRank), data.map(x => x.yhatRank))
    const error = stats.mean(data.map(x => x.err / x.y)) * 100
    return {data, numTotal, numTail, numFailed, coefficients, correlation, spearman, error}
  }
}

/**
 * @typedef {Object} AnalyzerRegressionOptions
 * @property {string} target
 * @property {string[]} predictors
 * @property {number=} outlierRejectionRate
 * @property {boolean=} forceOriginal
 */

/**
 * @typedef {Object} RegressionAnalysis
 * @property {Object[]} data
 * @property {number} numTotal
 * @property {number} numTail
 * @property {number} numFailed
 * @property {Object<string, number>} coefficients
 * @property {number} correlation
 * @property {number} spearman
 * @property {number} error
 */

module.exports = Analyzer
Analyzer.METRIC_NAMES = [
  'load',
  'firstContentfulPaint',
  'firstMeaningfulPaint',
  'timeToFirstInteractive',
  'timeToConsistentlyInteractive',
]
