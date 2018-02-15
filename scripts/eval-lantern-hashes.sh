#!/bin/bash

HASHES=(master baller_lantern_rtt_estimates)
LH_DIRECTORY=../lighthouse

CURRENT_HASH=$(cd $LH_DIRECTORY && git rev-parse HEAD)
CURRENT_POS=$(cd $LH_DIRECTORY && git name-rev $CURRENT_HASH | cut -d " " -f 2)

echo "WILL GO BACK TO $CURRENT_POS"
for githash in ${HASHES[*]}; do
  echo "Checking out and evaluating $githash..."
  ( cd $LH_DIRECTORY && git checkout -f $githash )
  ./scripts/eval-lantern.sh -f
done
