import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import { Common } from "./common";
import { EC2 } from "aws-sdk";

describe("Security Group", () => {
  let albSg: EC2.SecurityGroup;
  let lambdaSg: EC2.SecurityGroup;
  let dbSg: EC2.SecurityGroup;
  const common = new Common();
  before(async () => {
    albSg = await common.getSgByName("ALB Security Group");
    lambdaSg = await common.getSgByName("Lambda Security Group");
    dbSg = await common.getSgByName("Database Security Group");
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

  it("for Lambda should set properly. ", async () => {
    // common.printSg(lambdaSg);

    expect(1, "Lambda with only 1 ingress rule").to.equal(
      lambdaSg.IpPermissions!.length
    );

    expect(albSg.GroupId, "Lambda with ingress rule from ALB.").to.equal(
      lambdaSg.IpPermissions![0].UserIdGroupPairs![0].GroupId
    );
  });

  it("for Database should set properly. ", async () => {
    // common.printSg(dbSg);

    expect(1, "Database with only 1 ingress rule").to.equal(
      dbSg.IpPermissions!.length
    );

    expect(
      lambdaSg.GroupId,
      "Database with ingress rule from Lambda."
    ).to.equal(dbSg.IpPermissions![0].UserIdGroupPairs![0].GroupId);
  });
});
