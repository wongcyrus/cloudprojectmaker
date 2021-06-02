import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import { Common } from "./common";
import { EC2 } from "aws-sdk";

describe("Security Group", () => {
  let albSg: EC2.SecurityGroup;
  let lambdaSg: EC2.SecurityGroup;
  let dbSg: EC2.SecurityGroup;
  let sqsEp: EC2.VpcEndpoint;
  let secretMgnEp: EC2.VpcEndpoint;
  const common = new Common();
  before(async () => {
    albSg = await common.getSgByName("ALB Security Group");
    lambdaSg = await common.getSgByName("Web Lambda Security Group");
    dbSg = await common.getSgByName("Database Security Group");

    sqsEp = await common.geEndPointByServiceName("com.amazonaws.us-east-1.sqs");
    secretMgnEp = await common.geEndPointByServiceName(
      "com.amazonaws.us-east-1.secretsmanager"
    );
  });

  it("for ALB should set properly. ", async () => {
    // common.printSg(albSg);

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

  it("for Lambda should set ingress properly. ", async () => {
    //common.printSg(lambdaSg);

    expect(1, "Lambda with only 1 ingress rule").to.equal(
      lambdaSg.IpPermissions!.length
    );

    expect(albSg.GroupId, "Lambda with ingress rule from ALB.").to.equal(
      lambdaSg.IpPermissions![0].UserIdGroupPairs![0].GroupId
    );
  });

  it("for Lambda should set egress properly. ", async () => {
    //common.printSg(lambdaSg);

    const ec2Sdk = new EC2({ region: "us-east-1" });
    const prefixLists = await ec2Sdk.describePrefixLists().promise();
    const s3PrefixListId =
      prefixLists.PrefixLists?.find(
        (c) => c.PrefixListName === "com.amazonaws.us-east-1.s3"
      )?.PrefixListId || "";
    const s3EgressRule = lambdaSg.IpPermissionsEgress!.find(
      (c) => c.PrefixListIds![0].PrefixListId === s3PrefixListId
    );
    expect(s3EgressRule).exist;

    const dbEgressRule = lambdaSg.IpPermissionsEgress!.find(
      (c) => c.FromPort == 3306 && c.ToPort == 3306
    );
    expect(dbSg.GroupId, "Lambda with egress rule to Database.").to.equal(
      dbEgressRule!.UserIdGroupPairs![0].GroupId!
    );

    //Hints: You have to set your EgressRule Description properly!
    const sqsAndSecretManagerEgressRule = lambdaSg.IpPermissionsEgress!.find(
      (c) => c.FromPort == 443 && c.ToPort == 443
    );
    const sqsEgressRule = sqsAndSecretManagerEgressRule!.UserIdGroupPairs!.find(
      (c) => c.Description === "Lambda to SQS Endpoint"
    );
    expect(
      sqsEp.Groups![0].GroupId,
      "Lambda with egress rule to Secret Manager Interface Endpoint."
    ).to.equal(sqsEgressRule!.GroupId);

    const secretManagerEgressRule = sqsAndSecretManagerEgressRule!.UserIdGroupPairs!.find(
      (c) => c.Description === "Lambda to Secrets Manager Endpoint"
    );
    expect(
      secretMgnEp.Groups![0].GroupId,
      "Lambda with egress rule to SQS Interface Endpoint."
    ).to.equal(secretManagerEgressRule!.GroupId);
  });

  it("for Database should set properly. ", async () => {
    //ommon.printSg(dbSg);

    expect(1, "Database with only 1 ingress rule").to.equal(
      dbSg.IpPermissions!.length
    );

    expect(
      lambdaSg.GroupId,
      "Database with ingress rule from Lambda."
    ).to.equal(dbSg.IpPermissions![0].UserIdGroupPairs![0].GroupId);
  });
});
