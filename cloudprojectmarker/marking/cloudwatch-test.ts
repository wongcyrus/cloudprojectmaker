import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { SQS, SNS } from "aws-sdk";

describe("CloudWatch", () => {
  const cloudWatch: AWS.CloudWatch = new AWS.CloudWatch();
  const sns: AWS.SNS = new AWS.SNS();

  it("should have custom metric.", async () => {
    const errorMessageCount = await cloudWatch
      .listMetrics({
        MetricName: "error-message-count",
        Namespace: "cloudproject",
      })
      .promise();

    console.log(errorMessageCount);
    // const errorQueue = await sqs
    //   .listQueues({ QueueNamePrefix: "Error_Queue" })
    //   .promise();
    // const processQueue = await sqs
    //   .listQueues({
    //     QueueNamePrefix: "To_Be_Processed_Queue",
    //   })
    //   .promise();
    // expect(errorQueue.QueueUrls!.length, "Error_Queue exist.").to.equal(1);
    // expect(
    //   processQueue.QueueUrls!.length,
    //   "To_Be_Processed_Queue exist."
    // ).to.equal(1);
  });

});
