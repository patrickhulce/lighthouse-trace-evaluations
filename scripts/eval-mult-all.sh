#!/bin/bash

OUT_FOLDER=${1:-out-results}
echo "Processing from $OUT_FOLDER..."

for t in wpt lantern throttled unthrottled lightrider; do
  collatedinput="./$OUT_FOLDER/collated-multi-run-$t.json"
  analysisoutput="./$OUT_FOLDER/analysis-multi-run-$t.json"
  analyzer="./lib/analyzers/multi-run-analyzer.js"

  if [[ $t == lantern ]] || [[ $t == lightrider ]]; then
    analyzer="./lib/analyzers/lantern-multi-run-analyzer.js"
  fi

  node ./bin/analyze.js \
    -a $analyzer \
    -i $collatedinput \
    -o $analysisoutput \
    --collated

  echo "Converting $analysisoutput to CSV..."
  ./scripts/multi-run-to-scatter.js $analysisoutput > "./$OUT_FOLDER/multi-scatter-$t.csv"
  ./scripts/multi-run-to-summary.js $analysisoutput > "./$OUT_FOLDER/multi-summary-$t.csv"
  ./scripts/multi-run-to-medians.js $collatedinput > "./$OUT_FOLDER/collated-medians-$t.json"
done

for pair in "wpt;lantern" "wpt;throttled" "wpt;unthrottled" "wpt;lightrider" "throttled;lantern" "throttled;unthrottled" "lantern;lightrider"; do
  half1=`echo $pair | cut -d \; -f 1`
  half2=`echo $pair | cut -d \; -f 2`

  analysisoutput="./$OUT_FOLDER/xpa-multi-correl-$half1-$half2.json"
  collatedoutput="./$OUT_FOLDER/xpa-multi-correl-$half1-$half2.collated.json"

  echo "Analyzing accuracy of predicting $half1 from $half2..."
  ./scripts/merge-multi-run.js \
    "./$OUT_FOLDER/analysis-multi-run-$half1.json" \
    "./$OUT_FOLDER/analysis-multi-run-$half2.json" \
    > $collatedoutput

  node ./bin/analyze.js \
    -a ./lib/analyzers/metric-correlation-analyzer.js \
    -i $collatedoutput \
    -o $analysisoutput \
    --collated

  ./scripts/xpa-run-to-summary.js $analysisoutput $half1 $half2 > "./$OUT_FOLDER/xpa-$half1-$half2.csv"
done
