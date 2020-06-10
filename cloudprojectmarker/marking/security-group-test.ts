import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { EC2 } from "aws-sdk";

describe("Security Group", () => {
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
    albSg = await getSgByName("ALB Security Group");
    lambdaSg = await getSgByName("Lambda Security Group");
    dbSg = await getSgByName("Database Security Group");
  });

  it("for ALB should set properly. ", async () => {
    // printSg(albSg);

    expect(1, "ALB with only 1 ingress rule").to.equal(
      albSg.IpPermissions!.length
    );

    expect("0.0.0.0/0", "ALB with ingress rule from anywhere.").to.equal(
      albSg.IpPermissions![0].IpRanges![0].CidrIp
    );

    expect(80, "ALB with ingress rule for port 80.").to.equal(
      albSg.IpPermissions![0].ToPort
    );

    expect(1, "ALB with only 1 Egress rule").to.equal(
      albSg.IpPermissionsEgress!.length
    );

    expect(lambdaSg.GroupId, "ALB with Egress rule to Lambda only.").to.equal(
      albSg.IpPermissionsEgress![0].UserIdGroupPairs![0].GroupId
    );
  });

  it("for Lambda should set properly. ", async () => {
    // printSg(lambdaSg);

    expect(1, "Lambda with only 1 ingress rule").to.equal(
      lambdaSg.IpPermissions!.length
    );

    expect(albSg.GroupId, "Lambda with ingress rule from ALB.").to.equal(
      lambdaSg.IpPermissions![0].UserIdGroupPairs![0].GroupId
    );
  });

  it("for Database should set properly. ", async () => {
    // printSg(dbSg);

    expect(1, "Database with only 1 ingress rule").to.equal(
      dbSg.IpPermissions!.length
    );

    expect(
      lambdaSg.GroupId,
      "Database with ingress rule from Lambda."
    ).to.equal(dbSg.IpPermissions![0].UserIdGroupPairs![0].GroupId);
  });
});
