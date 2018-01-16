const Analyzer = require('./analyzer')
const MultiRunAnalyzer = require('./multi-run-analyzer')

class LanternMultiRunAnalyzer extends MultiRunAnalyzer {
  static getProcessors() {
    return [require('../processors/fast-mode-processor')]
  }

  static get METRIC_NAMES() {
    return Analyzer.LANTERN_METRIC_NAMES
  }
}

module.exports = LanternMultiRunAnalyzer
