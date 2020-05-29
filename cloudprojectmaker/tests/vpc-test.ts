import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";
import { EC2 } from "aws-sdk";

describe("VPC", () => {
  let studentData: GraderEvent;
  before(() => {
    studentData = JSON.parse(process.env.studentData!);
  });

  it("should be with cidr 10.0.0.0/16.", async () => {
    const ec2: AWS.EC2 = new AWS.EC2();

    let params: EC2.Types.DescribeVpcsRequest = {
      VpcIds: [studentData.vpcId],
    };
    const vpcs: EC2.Types.DescribeVpcsResult = await ec2
      .describeVpcs(params)
      .promise();
    console.log(vpcs);
    console.log(vpcs.Vpcs![0]);
    console.log(vpcs.Vpcs![0].CidrBlock);

    expect(vpcs.Vpcs![0].CidrBlock).to.equal("10.0.0.0/16");
  });

  it("should be with 6 subnets with proper Cidr address.", async () => {
    const ec2: AWS.EC2 = new AWS.EC2();

    let params = {
      Filters: [
        {
          Name: "vpc-id",
          Values: [studentData.vpcId],
        },
      ],
    };
    const subnets: EC2.Types.DescribeSubnetsResult = await ec2
      .describeSubnets(params)
      .promise();
    console.log(subnets.Subnets!);
    console.log(subnets.Subnets!.map((c) => c.CidrBlock).sort());

    expect(subnets.Subnets!.length).to.equal(6);
    let expectedCidrAddresses = [
      "10.0.0.0/24",
      "10.0.1.0/24",
      "10.0.12.0/22",
      "10.0.2.0/24",
      "10.0.4.0/22",
      "10.0.8.0/22",
    ];
    expect(subnets.Subnets!.map((c) => c.CidrBlock).sort()).to.deep.equal(
      expectedCidrAddresses
    );
  });
});
