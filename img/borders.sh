#!/bin/bash

cd "$(dirname "$0")"

for i in *-orig.png; do
    out="${i%-orig.png}.png"

    convert "$i" \
        -bordercolor '#dddddd' \
        -border 1x1 \
        "$out"
done
