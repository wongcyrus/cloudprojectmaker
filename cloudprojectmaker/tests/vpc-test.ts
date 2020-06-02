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
    // console.log(vpcs);
    // console.log(vpcs.Vpcs![0]);
    // console.log(vpcs.Vpcs![0].CidrBlock);

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
    const ec2: AWS.EC2 = new AWS.EC2();

    let params = {
      Filters: [
        {
          Name: "vpc-id",
          Values: [studentData.vpcId],
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
  it("should be with 3 connected Security Group for Web Applications.", async () => {
    const ec2: AWS.EC2 = new AWS.EC2();

    const getSgByName = async (
      groupName: string
    ): Promise<EC2.SecurityGroup> => {
      let params = {
        Filters: [
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

    const albSg: EC2.SecurityGroup = await getSgByName("ALB Security Group");

    const lambdaSg: EC2.SecurityGroup = await getSgByName(
      "Lambda Security Group"
    );

    const dbSg: EC2.SecurityGroup = await getSgByName(
      "Database Security Group"
    );

    printSg(lambdaSg);
    // printSg(dbSg);

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
  });
});
