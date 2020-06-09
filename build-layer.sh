#!/bin/bash
set -eo pipefail
cd lib/nodejs
rm -rf node_modules
npm install --production