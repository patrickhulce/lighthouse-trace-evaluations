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

  static findEarliestStartTime(artifacts) {
    if (artifacts.devtoolsLogs && artifacts.devtoolsLogs.defaultPass) {
      const minimumRequest = artifacts.devtoolsLogs.defaultPass.find(msg => msg.method === 'Network.requestWillBeSent')
      return minimumRequest.params.timestamp * 1000 * 1000
    }

    const criticalRequestChains = _.get(artifacts, 'lhResults.audits.critical-request-chains.extendedInfo.value.chains')
    if (criticalRequestChains) {
      const requestStartTimes = _.values(criticalRequestChains).map(x => x.request.startTime)
      return _.min(requestStartTimes) * 1000 * 1000
    }

    throw new Error('Unable to find earliest start time')
  }

  static extractMetrics(run) {
    const artifacts = loadArtifacts(run, {traces: false})
    const startedAt = Processor.findEarliestStartTime(artifacts)
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
