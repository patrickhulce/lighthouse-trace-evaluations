const Processor = require('./processor')
const PredictivePerf = require('../../../lighthouse/lighthouse-core/audits/predictive-perf')

class FastModeProcessor extends Processor {
  static async process(run) {
    return Object.assign(
      run,
      Processor.extractMetadata(run),
      Processor.extractMetrics(run),
      await FastModeProcessor.evaluateFastMode(run)
    )
  }

  static async evaluateFastMode(run) {
    const artifacts = Processor.loadArtifacts(run)
    return (await PredictivePerf.audit(artifacts)).extendedInfo.value
  }
}

module.exports = FastModeProcessor
module.exports.path = __filename
