import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";
import { EC2 } from "aws-sdk";

describe("VPC", () => {
  const ec2: AWS.EC2 = new AWS.EC2();
  it("should be with cidr 10.0.0.0/16.", async () => {
    let params: EC2.Types.DescribeVpcsRequest = {
      Filters: [{ Name: "tag:Name", Values: ["Cloud Project VPC"] }],
    };
    const vpcs: EC2.Types.DescribeVpcsResult = await ec2
      .describeVpcs(params)
      .promise();
    // console.log(vpcs);
    // console.log(vpcs.Vpcs![0]);
    // console.log(vpcs.Vpcs![0].CidrBlock);

    expect(vpcs.Vpcs![0].CidrBlock).to.equal("10.0.0.0/16");
  });

  it("should be with 6 subnets with proper Cidr address.", async () => {
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
      ],
    };
    const subnets: EC2.Types.DescribeSubnetsResult = await ec2
      .describeSubnets(params)
      .promise();
    // console.log(subnets.Subnets!);
    // console.log(subnets.Subnets!.map((c) => c.CidrBlock).sort());

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
  it("should be with 7 route tables for 6 subnets plus one local route only main route table.", async () => {
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
      ],
    };
    const routeTables: EC2.Types.DescribeRouteTablesResult = await ec2
      .describeRouteTables(params)
      .promise();

    expect(routeTables.RouteTables!.length, "7 subnets").to.equal(7);

    const firstRoute = routeTables
      .RouteTables!.filter((c) => c.Routes!.length > 1)
      .map((c) => c.Routes![1]);
    const numberOfInternetGatawayRoutes = firstRoute.filter((c) =>
      c.GatewayId!.startsWith("igw")
    ).length;
    const numberOfS3VpcGatewayEndpointRoutes = firstRoute.filter((c) =>
      c.GatewayId!.startsWith("vpce")
    ).length;
    expect(
      numberOfInternetGatawayRoutes,
      "3 route tables with public route."
    ).to.equal(3);
    expect(
      numberOfS3VpcGatewayEndpointRoutes,
      "3 route table with S3 VPC Endpoint route."
    ).to.equal(3);
  });
});