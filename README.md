# cloudprojectmarker

## Deploy the grader lambda.
git clone https://github.com/wongcyrus/cloud-project-marker

.\build-layer.sh

cd cloudprojectmarker/

npm i && npm run build

cd ..

sam build && sam deploy


## Run Lambda Local in the current AWS Account.
sam local invoke CloudProjectMarkerFunction

## Run Lambda Local in the other AWS Account.
sam local invoke -e events/event.json CloudProjectMarkerFunction

## Run the Lambda
CloudProjectMarkerFunction=$(aws cloudformation describe-stacks --stack-name cloudprojectmarker \
--query 'Stacks[0].Outputs[?OutputKey==`CloudProjectMarkerFunction`].OutputValue' --output text)

echo "Check Grade"
aws lambda invoke --function-name $CloudProjectMarkerFunction output.json
