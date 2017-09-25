const _ = require('lodash')
const loadArtifacts = require('../load').loadArtifacts

class Processor {
  static get loadArtifacts() { return loadArtifacts }
  static async process(run) { throw new Error('unimplemented') }

  static extractMetadata(run) {
    const artifacts = loadArtifacts(run, {traces: false, devtoolsLogs: false})
    return {
      url: artifacts.lhResults.initialUrl,
      finalUrl: artifacts.lhResults.finalUrl,
    }
  }

  static extractMetrics(run) {
    const artifacts = loadArtifacts(run, {traces: false})

    const minimumRequest = artifacts.devtoolsLogs.defaultPass.find(msg => msg.method === 'Network.requestWillBeSent')
    const startedAt = minimumRequest.params.timestamp * 1000 * 1000
    const rebaseMetric = ts => (ts - startedAt) / 1000

    const fmpAudit = _.get(artifacts, 'lhResults.audits.first-meaningful-paint.extendedInfo.value.timestamps') || {}
    const ttfiAudit = _.get(artifacts, 'lhResults.audits.first-interactive.extendedInfo.value') || {}
    const ttciAudit = _.get(artifacts, 'lhResults.audits.consistently-interactive.extendedInfo.value') || {}

    return {
      load: rebaseMetric(fmpAudit.onLoad),
      firstContentfulPaint: rebaseMetric(fmpAudit.fCP),
      firstMeaningfulPaint: rebaseMetric(fmpAudit.fMP),
      timeToFirstInteractive: rebaseMetric(ttfiAudit.timestamp),
      timeToConsistentlyInteractive: rebaseMetric(ttciAudit.timestamp),
    }
  }
}

module.exports = Processor
