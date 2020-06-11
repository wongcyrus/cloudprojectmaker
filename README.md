# cloudprojectmarker

## Deploy the grader lambda.
git clone https://github.com/wongcyrus/cloud-project-marker

Open samconfig.toml and change the bucket name in us-east-1.

s3_bucket = "XXXXXXX"

Run 2 commands

cd cloud-project-marker/

./deployment.sh


## Run Lambda Local in the current AWS Account.
sam local invoke CloudProjectMarkerFunction

## Run Lambda Local in the other AWS Account.
am local invoke -e events/event.json CloudProjectMarkerFunction

## During test case development, Run SAM Build and Lambda Local in the other AWS Account.
sam build && sam local invoke -e events/event.json CloudProjectMarkerFunction

## Run the Lambda
CloudProjectMarkerFunction=$(aws cloudformation describe-stacks --stack-name cloudprojectmarker \
--query 'Stacks[0].Outputs[?OutputKey==`CloudProjectMarkerFunction`].OutputValue' --output text)

echo "Check Grade"
aws lambda invoke --function-name $CloudProjectMarkerFunction output.json
