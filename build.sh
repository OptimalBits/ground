#!/bin/sh
echo "Compiling typescript..."
tsc --sourcemap --out dist/gnd.js gnd.ts
uglifyjs dist/gnd.js -c warnings=false -m > dist/gnd.min.js
tsc --out dist/gnd-server.js gnd-server.ts
