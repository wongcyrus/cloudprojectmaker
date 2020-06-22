#!/bin/bash
./build-layer.sh
sudo yum install jq -y
cd cloudprojectmarker/
npm i && npm run build
cd ..
sam build && sam deploy