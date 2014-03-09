#!/bin/sh

convert thumb-les-mis-orig.png \
    -crop 303x156+250+100 \
    -resize 66.67% \
    thumb-example.png
