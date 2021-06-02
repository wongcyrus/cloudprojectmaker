import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { Common } from "./common";
import { Helper } from "./../helper";

import * as chai from "chai";
import * as chaiSubset from "chai-subset";
import * as chaiString from "chai-string";
import { LoadBalancer } from "aws-sdk/clients/elbv2";
chai.use(chaiSubset);
chai.use(chaiString);

describe("Application Load Balancing", () => {
  const elb: AWS.ELBv2 = new AWS.ELBv2();
  const ec2: AWS.EC2 = new AWS.EC2();
  const common = new Common();

  let alb: LoadBalancer;
  let awsAccount: string;
  let graderParmeters: any;

  before(async () => {
    const helper = new Helper();
    graderParmeters = helper.getGraderParmeters();
    console.log(graderParmeters);

    awsAccount = await common.getAWSAccount();
    const albs = await elb
      .describeLoadBalancers({ Names: ["WebAlb"] })
      .promise();
    alb = albs.LoadBalancers![0];
    // console.log(alb);
  });

  it("should be internet facing ALB.", async () => {
    const expected = {
      Scheme: "internet-facing",
      Type: "application",
      IpAddressType: "ipv4",
    };
    expect(alb, "IP v4 Internet facing ALB.").to.containSubset(expected);
  });

  it("should use 2 public subnets.", async () => {
    expect(2, "2 Subnets").to.eq(alb.AvailabilityZones!.length);
    const subnets = await ec2
      .describeSubnets({
        Filters: [
          {
            Name: "subnet-id",
            Values: alb.AvailabilityZones!.map((c) => c.SubnetId!),
          },
        ],
      })
      .promise();
    // console.log(subnets.Subnets);
    expect(
      subnets.Subnets![0].AvailabilityZone,
      "uses 2 subnets in different AZ"
    ).to.not.eq(subnets.Subnets![1].AvailabilityZone);

    expect(subnets.Subnets![0].CidrBlock!, "public subnet.").to.endWith("/24");
    expect(subnets.Subnets![1].CidrBlock!, "public subnet.").to.endWith("/24");
  });

  it("should have 1 listener.", async () => {
    const listeners = await elb
      .describeListeners({ LoadBalancerArn: alb.LoadBalancerArn })
      .promise();
    const listener = listeners.Listeners![0];

    expect(80, "port 80").to.eq(listener.Port);
    expect("HTTP", "port 80").to.eq(listener.Protocol);
    const defaultAction = listener.DefaultActions![0];
    // console.log(JSON.stringify(defaultAction));

    const expected = {
      Type: "forward",
      ForwardConfig: {
        TargetGroups: [
          {
            Weight: 1,
          },
        ],
        TargetGroupStickinessConfig: { Enabled: false },
      },
    };
    expect(defaultAction, "One default forward action.").to.containSubset(
      expected
    );
  });

  it("should have 2 target groups.", async () => {
    const targetGroups = await elb
      .describeTargetGroups({ LoadBalancerArn: alb.LoadBalancerArn })
      .promise();
    expect(2, "2 target groups").to.eq(targetGroups.TargetGroups!.length);
    // console.log(targetGroups);
    const lambdaTargetGroup = targetGroups.TargetGroups!.find(
      (c) => c.TargetType === "lambda"
    );
    const ipTargetGroup = targetGroups.TargetGroups!.find(
      (c) => c.TargetType === "ip"
    );

    //console.log(lambdaTargetGroup);
    const expectedLambdaTargetGroup = {
      HealthCheckEnabled: true,
      HealthCheckIntervalSeconds: 300,
      HealthCheckTimeoutSeconds: 30,
      HealthyThresholdCount: 5,
      UnhealthyThresholdCount: 2,
      HealthCheckPath: "/",
      Matcher: { HttpCode: "200" },
      TargetType: "lambda",
    };
    expect(lambdaTargetGroup, "Lambda TargetGroup settings.").to.containSubset(
      expectedLambdaTargetGroup
    );
    //  console.log(ipTargetGroup);
    const expectedIpTargetGroup = {
      Protocol: "HTTP",
      Port: 80,
      HealthCheckProtocol: "HTTP",
      HealthCheckPort: "traffic-port",
      HealthCheckEnabled: true,
      HealthCheckIntervalSeconds: 300,
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
      UnhealthyThresholdCount: 2,
      HealthCheckPath: "/",
      Matcher: { HttpCode: "200" },
      TargetType: "ip",
    };
    expect(ipTargetGroup, "Lambda TargetGroup settings.").to.containSubset(
      expectedIpTargetGroup
    );

    const listeners = await elb
      .describeListeners({ LoadBalancerArn: alb.LoadBalancerArn })
      .promise();
    const listener = listeners.Listeners![0];

    const rules = await elb
      .describeRules({ ListenerArn: listener.ListenerArn })
      .promise();
    //console.log(rules);
    expect(2, "2 rules").to.eq(rules.Rules!.length);
    const defauleRule = rules.Rules!.find((c) => c.IsDefault);
    //console.log(JSON.stringify(defauleRule));

    const expectedDefaultRule = {
      Priority: "default",
      Conditions: [],
      Actions: [
        {
          Type: "forward",
          TargetGroupArn: lambdaTargetGroup!.TargetGroupArn,
          ForwardConfig: {
            TargetGroups: [
              {
                TargetGroupArn: lambdaTargetGroup!.TargetGroupArn,
                Weight: 1,
              },
            ],
            TargetGroupStickinessConfig: { Enabled: false },
          },
        },
      ],
      IsDefault: true,
    };
    expect(defauleRule, "Lambda TargetGroup settings.").to.containSubset(
      expectedDefaultRule
    );

    const ipRule = rules.Rules!.find((c) => !c.IsDefault);
    //console.log(JSON.stringify(ipRule));
    const expectedIpRule = {
      Priority: "10",
      Conditions: [
        {
          Field: "path-pattern",
          Values: ["/dummy", "/Dummy"],
          PathPatternConfig: { Values: ["/dummy", "/Dummy"] },
        },
      ],
      Actions: [
        {
          Type: "forward",
          TargetGroupArn: ipTargetGroup!.TargetGroupArn,
          ForwardConfig: {
            TargetGroups: [
              {
                TargetGroupArn: ipTargetGroup!.TargetGroupArn,
                Weight: 1,
              },
            ],
            TargetGroupStickinessConfig: { Enabled: false },
          },
        },
      ],
      IsDefault: false,
    };

    expect(ipRule, "IP TargetGroup settings.").to.containSubset(expectedIpRule);

    const ipTargetGroupAttributes = await elb
      .describeTargetGroupAttributes({
        TargetGroupArn: ipTargetGroup!.TargetGroupArn!,
      })
      .promise();
    //console.log(ipTargetGroupAttributes);

    const expectedIpTargetGroupAttributes = [
      { Key: "stickiness.enabled", Value: "false" },
      { Key: "deregistration_delay.timeout_seconds", Value: "300" },
      { Key: "stickiness.type", Value: "lb_cookie" },
      { Key: "stickiness.lb_cookie.duration_seconds", Value: "86400" },
      { Key: "slow_start.duration_seconds", Value: "0" },
      { Key: "load_balancing.algorithm.type", Value: "round_robin" },
    ];

    expect(
      expectedIpTargetGroupAttributes,
      "Lambda TargetGroup Attributes."
    ).to.deep.eq(ipTargetGroupAttributes.Attributes);

    const ipTargetHealth = await elb
      .describeTargetHealth({
        TargetGroupArn: ipTargetGroup!.TargetGroupArn!,
      })
      .promise();
    // console.log(JSON.stringify(ipTargetHealth));

    const dummyIpTargets = ipTargetHealth
      .TargetHealthDescriptions!.map((c) => c.Target!.Id)
      .sort();
    // console.log(dummyIpTargets);
    const expectedDummyIpTargets = ["10.0.4.4", "10.0.8.4"];
    expect(dummyIpTargets, "2 ip in 2 public subnets").to.deep.eq(
      expectedDummyIpTargets
    );

    const lambdaTargetHealth = await elb
      .describeTargetHealth({
        TargetGroupArn: lambdaTargetGroup!.TargetGroupArn!,
      })
      .promise();
    // console.log(JSON.stringify(lambdaTargetHealth));
    const expectedLambdaTarget = {
      Target: {
        Id: `arn:aws:lambda:us-east-1:${awsAccount}:function:WebLambda`,
        AvailabilityZone: "all",
      },
    };

    expect(
      lambdaTargetHealth.TargetHealthDescriptions![0],
      "to WebLambda in all AZs."
    ).to.containSubset(expectedLambdaTarget);
  });
});
