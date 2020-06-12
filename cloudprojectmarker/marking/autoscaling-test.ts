import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";

import * as chai from "chai";
import * as chaiSubset from "chai-subset";
chai.use(chaiSubset);

import { STS, SNS, EC2 } from "aws-sdk";

describe("AutoScaling", () => {
  const sqs: AWS.SQS = new AWS.SQS();
  const autoScaling: AWS.AutoScaling = new AWS.AutoScaling();
  const iam: AWS.IAM = new AWS.IAM();
  const sts: AWS.STS = new AWS.STS();

  it("should set properly.", async () => {
    const autoScalingGroups = await autoScaling
      .describeAutoScalingGroups({
        AutoScalingGroupNames: ["SqsAutoScalingGroup"],
      })
      .promise();
    // console.log(autoScalingGroups.AutoScalingGroups![0]);

    const expected = {
      AutoScalingGroupName: "SqsAutoScalingGroup",
      MinSize: 0,
      MaxSize: 5,
      DesiredCapacity: 0,
      DefaultCooldown: 300,
      AvailabilityZones: ["us-east-1a", "us-east-1b"],
      HealthCheckType: "EC2",
      HealthCheckGracePeriod: 300,
    };

    expect(
      autoScalingGroups.AutoScalingGroups![0],
      "min 0, max 5, desired 0, cooldown 5 mins, grace period 5 mins and HealthCheckType to EC2."
    ).to.containSubset(expected);
  });

  it("should have a Launch Configuration in instance type t2.nano.", async () => {
    const autoScalingGroups = await autoScaling
      .describeAutoScalingGroups({
        AutoScalingGroupNames: ["SqsAutoScalingGroup"],
      })
      .promise();
    // console.log(
    //   autoScalingGroups.AutoScalingGroups![0].LaunchConfigurationName
    // );
    const launchConfigurationName = autoScalingGroups.AutoScalingGroups![0]
      .LaunchConfigurationName;

    const launchConfigurations = await autoScaling
      .describeLaunchConfigurations({
        LaunchConfigurationNames: [launchConfigurationName!],
      })
      .promise();

    // console.log(launchConfigurations.LaunchConfigurations![0]);
    expect(
      "t2.nano",
      "User data that gets job from SQS and send message to log group."
    ).to.equal(launchConfigurations.LaunchConfigurations![0].InstanceType!);
  });

  it("should have a Launch Configuration with correct UserData.", async () => {
    const autoScalingGroups = await autoScaling
      .describeAutoScalingGroups({
        AutoScalingGroupNames: ["SqsAutoScalingGroup"],
      })
      .promise();
    // console.log(
    //   autoScalingGroups.AutoScalingGroups![0].LaunchConfigurationName
    // );
    const launchConfigurationName = autoScalingGroups.AutoScalingGroups![0]
      .LaunchConfigurationName;

    const launchConfigurations = await autoScaling
      .describeLaunchConfigurations({
        LaunchConfigurationNames: [launchConfigurationName!],
      })
      .promise();

    // console.log(launchConfigurations.LaunchConfigurations![0]);

    const buff = Buffer.from(
      launchConfigurations.LaunchConfigurations![0].UserData!,
      "base64"
    );
    const userData = buff.toString("ascii");
    // console.log(userData);

    const processQueueUrl = (
      await sqs
        .listQueues({
          QueueNamePrefix: "To_Be_Processed_Queue",
        })
        .promise()
    ).QueueUrls![0];
    const queueUrl = processQueueUrl;
    //Hints: check the difference and it may be #!/bin/bash .
    const expectedUserData = `#!/bin/bash
yum update -y
yum -y install jq
aws configure set default.region us-east-1
echo "Get Message from ${queueUrl})"
ec2InstanceId=$(ec2-metadata --instance-id | cut -d " " -f 2);
echo $ec2InstanceId
LogGroupName=/cloudproject/batchprocesslog
aws logs create-log-stream --log-group-name $LogGroupName --log-stream-name $ec2InstanceId
while sleep 10
do
  MSG=$(aws sqs receive-message --queue-url ${queueUrl})
  [ ! -z "$MSG"  ] && echo "$MSG" | jq -r '.Messages[] | .ReceiptHandle' | (xargs -I {} aws sqs delete-message --queue-url ${queueUrl} --receipt-handle {})
  Message=$(echo "$MSG" | jq -r '.Messages[] | .Body')
  echo $Message
  TimeStamp=\`date "+%s%N" --utc\`
  TimeStamp=\`expr $TimeStamp / 1000000\`
  echo $TimeStamp
  UploadSequenceToken=$(aws logs describe-log-streams --log-group-name "$LogGroupName" --query 'logStreams[?logStreamName==\`'$ec2InstanceId'\`].[uploadSequenceToken]' --output text)
  echo $UploadSequenceToken
  if [ "$UploadSequenceToken" != "None" ]
  then
    aws logs put-log-events --log-group-name "$LogGroupName" --log-stream-name "$ec2InstanceId" --log-events timestamp=$TimeStamp,message="$Message" --sequence-token $UploadSequenceToken
  else
    aws logs put-log-events --log-group-name "$LogGroupName" --log-stream-name "$ec2InstanceId" --log-events timestamp=$TimeStamp,message="$Message"
  fi
done
`;

    expect(
      expectedUserData.replace(/[^\x00-\x7F]/g, "").replace(/\s/g, ""),
      "User data that gets job from SQS and send message to log group."
    ).to.equal(userData.replace(/[^\x00-\x7F]/g, "").replace(/\s/g, ""));
  });

  it("should have a proper IAM Role Permission.", async () => {
    const autoScalingGroups = await autoScaling
      .describeAutoScalingGroups({
        AutoScalingGroupNames: ["SqsAutoScalingGroup"],
      })
      .promise();
    // console.log(
    //   autoScalingGroups.AutoScalingGroups![0].LaunchConfigurationName
    // );
    const launchConfigurationName = autoScalingGroups.AutoScalingGroups![0]
      .LaunchConfigurationName;

    const launchConfigurations = await autoScaling
      .describeLaunchConfigurations({
        LaunchConfigurationNames: [launchConfigurationName!],
      })
      .promise();

    // console.log(
    //   launchConfigurations.LaunchConfigurations![0].IamInstanceProfile!
    // );

    const instanceProfile = await iam
      .getInstanceProfile({
        InstanceProfileName: launchConfigurations.LaunchConfigurations![0]
          .IamInstanceProfile!,
      })
      .promise();

    // console.log(instanceProfile.InstanceProfile.Roles[0]);
    // console.log(
    //   decodeURIComponent(
    //     instanceProfile.InstanceProfile.Roles[0].AssumeRolePolicyDocument!
    //   )
    // );
    const assumeRolePolicyDcoument = decodeURIComponent(
      instanceProfile.InstanceProfile.Roles[0].AssumeRolePolicyDocument!
    );
    let expected = `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}`;
    expect(expected, "EC2 role.").to.equal(assumeRolePolicyDcoument);

    const rolePolicies = await iam
      .listRolePolicies({
        RoleName: instanceProfile.InstanceProfile.Roles[0].RoleName,
      })
      .promise();

    const policyName = rolePolicies.PolicyNames[0];

    const policy = await iam
      .getRolePolicy({
        RoleName: instanceProfile.InstanceProfile.Roles[0].RoleName,
        PolicyName: policyName,
      })
      .promise();

    const callerId = await sts.getCallerIdentity().promise();
    const awsAccountId = callerId.Account!;
    const inlinePolicyDcoument = decodeURIComponent(policy.PolicyDocument);
    // console.log(inlinePolicyDcoument);
    expected = `{"Version":"2012-10-17",
    "Statement":[
    {"Action":["logs:CreateLogStream","logs:PutLogEvents"],"Resource":"arn:aws:logs:us-east-1:${awsAccountId}:log-group:/cloudproject/batchprocesslog:*","Effect":"Allow"},
    {"Action":"logs:DescribeLogStreams","Resource":"arn:aws:logs:us-east-1:${awsAccountId}:log-group:/cloudproject/batchprocesslog:*","Effect":"Allow"},
    {"Action":["sqs:ReceiveMessage","sqs:ChangeMessageVisibility","sqs:GetQueueUrl","sqs:DeleteMessage","sqs:GetQueueAttributes"],"Resource":"arn:aws:sqs:us-east-1:${awsAccountId}:To_Be_Processed_Queue","Effect":"Allow"}]}`;
    expect(
      expected.replace(/\n/g, "").replace(/\s/g, ""),
      "permission for log group, and SQS."
    ).to.equal(inlinePolicyDcoument);
  });
});
