#!/usr/bin/env bash
# Rebuild gargantua/dist/gargantua.js (three.js + engine + site glue, minified, single classic script).
# Needs Node. esbuild is fetched on demand: no package.json or node_modules in the project.
set -euo pipefail
cd "$(dirname "$0")"
npx --yes esbuild@0.28.2 src/site.js \
  --bundle --minify --format=iife --target=es2020 \
  --alias:three=./vendor/three.module.js \
  --legal-comments=none \
  --outfile=dist/gargantua.js
ls -lh dist/gargantua.js
