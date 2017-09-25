const _ = require('lodash')
const LinearRegression = require('shaman').LinearRegression

class Analyzer {
  static getProcessors() { throw new Error('unimplemented') }
  static collate() { throw new Error('unimplemented') }
  static async analyze() { throw new Error('unimplemented') }

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
        errAsPercent: Math.abs(y - yhat) / y
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
    const X = []
    const Y = []

    for (const item of data) {
      const predictors = []
      for (const key of options.predictors) {
        predictors.push(item[key])
      }

      X.push(predictors)
      Y.push(item[options.target])
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
}

module.exports = Analyzer
