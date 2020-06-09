import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";
import { EC2 } from "aws-sdk";

describe("Security Group", () => {
  let studentData: GraderEvent;
  const ec2: AWS.EC2 = new AWS.EC2();
  const getSgByName = async (groupName: string): Promise<EC2.SecurityGroup> => {
        let params: EC2.Types.DescribeVpcsRequest = {
      Filters: [{ Name: "tag:Name", Values: ["Cloud Project VPC"] }],
    };
        const vpcs: EC2.Types.DescribeVpcsResult = await ec2
      .describeVpcs(params)
      .promise();


    params = {
      Filters: [
        {
          Name: "vpc-id",
          Values: [vpcs.Vpcs![0].VpcId!],
        },
        {
          Name: "group-name",
          Values: [groupName],
        },
      ],
    };
    const securityGroups: EC2.Types.DescribeSecurityGroupsResult = await ec2
      .describeSecurityGroups(params)
      .promise();
    return securityGroups.SecurityGroups![0];
  };

  const printSg = (sg: EC2.SecurityGroup) => {
    console.log(sg);
    console.log(sg.IpPermissions!.length);
    console.log(sg.IpPermissions![0]);
    console.log(sg.IpPermissions![0].IpRanges);
  };

  let albSg: EC2.SecurityGroup;
  let lambdaSg: EC2.SecurityGroup;
  let dbSg: EC2.SecurityGroup;

  before(async () => {
    studentData = JSON.parse(process.env.studentData!);
    albSg = await getSgByName("ALB Security Group");
    lambdaSg = await getSgByName("Lambda Security Group");
    dbSg = await getSgByName("Database Security Group");
  });

  it("for ALB should set properly. ", async () => {
    // printSg(albSg);

    expect(
      albSg.IpPermissions!.length,
      "ALB with only 1 ingress rule"
    ).to.equal(1);

    expect(
      albSg.IpPermissions![0].IpRanges![0].CidrIp,
      "ALB with ingress rule from anywhere."
    ).to.equal("0.0.0.0/0");

    expect(
      albSg.IpPermissions![0].ToPort,
      "ALB with ingress rule for port 80."
    ).to.equal(80);

    expect(
      albSg.IpPermissionsEgress!.length,
      "ALB with only 1 Egress rule"
    ).to.equal(1);

    expect(
      albSg.IpPermissionsEgress![0].UserIdGroupPairs![0].GroupId,
      "ALB with Egress rule to Lambda only."
    ).to.equal(lambdaSg.GroupId);
  });

  it("for Lambda should set properly. ", async () => {
    // printSg(lambdaSg);

    expect(
      lambdaSg.IpPermissions!.length,
      "Lambda with only 1 ingress rule"
    ).to.equal(1);

    expect(
      lambdaSg.IpPermissions![0].UserIdGroupPairs![0].GroupId,
      "Lambda with ingress rule from ALB."
    ).to.equal(albSg.GroupId);
  });

  it("for Database should set properly. ", async () => {
    // printSg(dbSg);

    expect(
      dbSg.IpPermissions!.length,
      "Database with only 1 ingress rule"
    ).to.equal(1);

    expect(
      dbSg.IpPermissions![0].UserIdGroupPairs![0].GroupId,
      "Database with ingress rule from Lambda."
    ).to.equal(lambdaSg.GroupId);
  });
});
