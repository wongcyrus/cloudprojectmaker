import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";

describe("VPC", () => {
  let studentData: GraderEvent;
  before(() => {
   studentData = JSON.parse(process.env.studentData!);
  });

  it("should return hello world", async () => {
    const ec2: AWS.EC2 = new AWS.EC2();

    const vpcs: AWS.EC2.Types.DescribeVpcsResult = await ec2
      .describeVpcs()
      .promise();
    // console.log(event);
    console.log(studentData);
    console.log(vpcs);

    expect("Hello World!").to.equal("Hello World!");
  });
});
