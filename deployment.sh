#!/bin/bash
./build-layer.sh
sudo yum install jq -y
cd cloudprojectmarker/
npm i && npm run build
cd ..
sam build && sam deploy
TestReportBucket=$(aws cloudformation describe-stacks --stack-name cloudprojectmarker \
--query 'Stacks[0].Outputs[?OutputKey==`TestReportBucket`].OutputValue' --output text)
sed "s~######~$TestReportBucket~g" env.template.json > env.json