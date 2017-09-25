const Processor = require('./processor')

class MetricsProcessor extends Processor {
  static async process(run) {
    return Object.assign(
      run,
      Processor.extractMetadata(run),
      Processor.extractMetrics(run)
    )
  }
}

module.exports = MetricsProcessor
module.exports.path = __filename
