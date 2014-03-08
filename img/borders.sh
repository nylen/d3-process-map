#!/bin/bash

cd "$(dirname "$0")"

for i in *-orig.png; do
    out="${i%-orig.png}.png"

    convert "$i" \
        -bordercolor '#cacaca' \
        -border 1x1 \
        -bordercolor '#eeeeee' \
        -border 2x2 \
        "$out"
done
