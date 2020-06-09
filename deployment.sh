#!/bin/bash
cd cloud-project-marker
./build-layer.sh
cd cloudprojectmarker/
npm i && npm run build
cd ..
sam build && sam deploy