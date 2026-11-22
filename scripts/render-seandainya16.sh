#!/bin/sh
# Renders chapters 2-10 of the 16:9 "Seandainya" one after another (half-resolution previews, smaller files).
# usage: sh scripts/render-seandainya16.sh [scale] [crf]     e.g.  sh scripts/render-seandainya16.sh 0.5 26
SCALE=${1:-0.5}; CRF=${2:-26}
for n in 02 03 04 05 06 07 08 09 10; do
  node scripts/render.mjs --comp Seandainya16Ch${n}ShortWithCaptions --mode video --scale $SCALE --crf $CRF --concurrency 3 --out out/seandainya16/Bab${n}_preview.mp4 || echo "chapter $n failed"
done
