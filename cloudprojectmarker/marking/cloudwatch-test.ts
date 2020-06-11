import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";

import * as chai from "chai";
import * as chaiSubset from "chai-subset";
chai.use(chaiSubset);

//Hints: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CountOccurrencesExample.html
describe("CloudWatch", () => {
  const cloudWatch: AWS.CloudWatch = new AWS.CloudWatch();
  const cloudWatchLogs: AWS.CloudWatchLogs = new AWS.CloudWatchLogs();
  const sns: AWS.SNS = new AWS.SNS();

  it("should have batchprocesslog log group with 1 Metric Filter.", async () => {
    const batchprocesslogGroups = await cloudWatchLogs
      .describeLogGroups({
        logGroupNamePrefix: "/cloudproject/batchprocesslog",
      })
      .promise();

    // console.log(batchprocesslogGroups.logGroups![0].metricFilterCount);

    expect(1, "only 1 Metric Filter").to.equal(
      batchprocesslogGroups.logGroups![0].metricFilterCount
    );
  });

  it("should have 1 Metric Filter for error terms.", async () => {
    const batchprocesslogGroupMetricFilters = await cloudWatchLogs
      .describeMetricFilters({ logGroupName: "/cloudproject/batchprocesslog" })
      .promise();

    // console.log(batchprocesslogGroupMetricFilters.metricFilters![0]);

    expect('?"error" ?"ERROR" ?"Error"', "check error.").to.equal(
      batchprocesslogGroupMetricFilters.metricFilters![0].filterPattern
    );

    const expectedMetricTransformation = {
      metricName: "error-message-count",
      metricNamespace: "cloudproject",
      metricValue: "1",
    };
    expect(expectedMetricTransformation).to.deep.equal(
      batchprocesslogGroupMetricFilters.metricFilters![0]
        .metricTransformations![0]
    );
    expect("/cloudproject/batchprocesslog").to.equal(
      batchprocesslogGroupMetricFilters.metricFilters![0].logGroupName
    );
  });

  it("should have 1 alarm for error terms.", async () => {
    const errorTermsAlarms = await cloudWatch
      .describeAlarms({ AlarmNames: ["alarms-batchProcessErrors"] })
      .promise();

    //console.log(errorTermsAlarms.MetricAlarms![0]);

    expect(
      errorTermsAlarms.MetricAlarms![0],
      "counts on number of error messages per 1 mins with proper settings."
    ).to.containSubset({
      AlarmName: "alarms-batchProcessErrors",
      ActionsEnabled: true,
      OKActions: [],
      InsufficientDataActions: [],
      StateValue: "INSUFFICIENT_DATA",
      MetricName: "error-message-count",
      Statistic: "SampleCount",
      Dimensions: [],
      Period: 60,
      EvaluationPeriods: 1,
      Threshold: 0,
      ComparisonOperator: "GreaterThanThreshold",
      TreatMissingData: "missing",
      Metrics: [],
    });
    expect(
      errorTermsAlarms.MetricAlarms![0].AlarmActions![0],
      "Action to the Error topic"
    ).to.have.string("ErrorTopic");
  });

  it("should have 1 alarm for error terms.", async () => {
    const errorTermsAlarms = await cloudWatch
      .describeAlarms({ AlarmNames: ["alarms-batchProcessErrors"] })
      .promise();

    //console.log(errorTermsAlarms.MetricAlarms![0]);

    expect(
      errorTermsAlarms.MetricAlarms![0],
      "counts on number of error messages per 1 mins with proper settings."
    ).to.containSubset({
      AlarmName: "alarms-batchProcessErrors",
      ActionsEnabled: true,
      OKActions: [],
      InsufficientDataActions: [],
      StateValue: "INSUFFICIENT_DATA",
      MetricName: "error-message-count",
      Statistic: "SampleCount",
      Dimensions: [],
      Period: 60,
      EvaluationPeriods: 1,
      Threshold: 0,
      ComparisonOperator: "GreaterThanThreshold",
      TreatMissingData: "missing",
      Metrics: [],
    });
    expect(
      errorTermsAlarms.MetricAlarms![0].AlarmActions![0],
      "Action to the Error topic"
    ).to.have.string("ErrorTopic");
  });
});
