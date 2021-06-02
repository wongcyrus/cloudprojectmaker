import * as AWS from "aws-sdk";
import { EC2 } from "aws-sdk";

export interface ICommon {
  getSgByName(groupName: string): Promise<EC2.SecurityGroup>;
  printSg(sg: EC2.SecurityGroup): void;
  getAWSAccount(): Promise<string>;
}

export class Common implements ICommon {
  getSgByName = async (groupName: string): Promise<EC2.SecurityGroup> => {
    const ec2: AWS.EC2 = new AWS.EC2();
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

  geEndPointByServiceName = async (
    serviceName: string
  ): Promise<EC2.VpcEndpoint> => {
    const ec2: AWS.EC2 = new AWS.EC2();
    let params: EC2.Types.DescribeVpcsRequest = {
      Filters: [{ Name: "tag:Name", Values: ["Cloud Project VPC"] }],
    };
    const vpcs: EC2.Types.DescribeVpcsResult = await ec2
      .describeVpcs(params)
      .promise();

    const endPointparams = {
      Filters: [
        {
          Name: "vpc-id",
          Values: [vpcs.Vpcs![0].VpcId!],
        },
        {
          Name: "service-name",
          Values: [serviceName],
        },
      ],
    };
    const endpoints: EC2.Types.DescribeVpcEndpointsResult = await ec2
      .describeVpcEndpoints(endPointparams)
      .promise();
    return endpoints.VpcEndpoints![0];
  };

  printSg = (sg: EC2.SecurityGroup): void => {
    console.log(JSON.stringify(sg));
    console.log(sg.IpPermissions!.length);
    console.log(sg.IpPermissions![0]);
    console.log(sg.IpPermissions![0].IpRanges);
  };

  getAWSAccount = async (): Promise<string> => {
    const sts: AWS.STS = new AWS.STS();
    const callerId = await sts.getCallerIdentity().promise();
    return callerId.Account!;
  };
}
