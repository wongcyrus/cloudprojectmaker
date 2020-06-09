# cloudprojectmarker

## Deploy the grader lambda.
git clone https://github.com/wongcyrus/cloud-project-marker

Open samconfig.toml and check the bucket name in us-east-1.

./deployment.sh


## Run Lambda Local in the current AWS Account.
sam local invoke CloudProjectMarkerFunction

## Run Lambda Local in the other AWS Account.
sam local invoke -e events/event.json CloudProjectMarkerFunction

## Run the Lambda
CloudProjectMarkerFunction=$(aws cloudformation describe-stacks --stack-name cloudprojectmarker \
--query 'Stacks[0].Outputs[?OutputKey==`CloudProjectMarkerFunction`].OutputValue' --output text)

echo "Check Grade"
aws lambda invoke --function-name $CloudProjectMarkerFunction output.json
