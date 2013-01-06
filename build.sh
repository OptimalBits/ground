#!/bin/sh
tsc --out dist/gnd.js gnd.ts
uglifyjs dist/gnd.js -c -m > dist/gnd.min.js
