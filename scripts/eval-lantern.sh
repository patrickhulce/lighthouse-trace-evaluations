#!/bin/bash

FORCE=$1
UNTHROTTLED_TRACES_FOLDER=../lighthouse/plots/out-tmp/out-0-300
echo "Processing traces from $UNTHROTTLED_TRACES_FOLDER..."

OUT_FOLDER=out-results
COMPARISON_GOAL="./$OUT_FOLDER/collated-medians-wpt.json"
echo "Dumping output into $OUT_FOLDER..."

ANALYSIS_OUTPUT="./$OUT_FOLDER/analysis-lantern-$t.json"
ANALYZER="./lib/analyzers/fast-mode-accuracy-analyzer.js"
QUICK_INDEX=2

SINGLE_RUN_INDEX=$QUICK_INDEX node ./bin/analyze.js \
  -a $ANALYZER \
  -i $COMPARISON_GOAL \
  -i $UNTHROTTLED_TRACES_FOLDER \
  -o $ANALYSIS_OUTPUT $FORCE

./scripts/print-lantern-analysis.js $ANALYSIS_OUTPUT
