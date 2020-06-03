import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";
import { SQS, SNS } from "aws-sdk";

describe("SQS and SNS", () => {
  let studentData: GraderEvent;
  const sqs: AWS.SQS = new AWS.SQS();
  const sns: AWS.SNS = new AWS.SNS();

  before(async () => {
    studentData = JSON.parse(process.env.studentData!);
  });

  it("should have 2 SQS queues. ", async () => {
    const errorQueue = await sqs
      .listQueues({ QueueNamePrefix: "Error_Queue" })
      .promise();
    const processQueue = await sqs
      .listQueues({
        QueueNamePrefix: "To_Be_Processed_Queue",
      })
      .promise();
    expect(errorQueue.QueueUrls!.length, "Error_Queue exist.").to.equal(1);
    expect(
      processQueue.QueueUrls!.length,
      "To_Be_Processed_Queue exist."
    ).to.equal(1);
  });

  it("To_Be_Processed_Queue should have 300 seconds VisibilityTimeout. ", async () => {
    const processQueueUrl = (
      await sqs
        .listQueues({
          QueueNamePrefix: "To_Be_Processed_Queue",
        })
        .promise()
    ).QueueUrls![0];
    const processQueueAttributes: SQS.Types.GetQueueAttributesResult = await sqs
      .getQueueAttributes({
        QueueUrl: processQueueUrl,
        AttributeNames: ["VisibilityTimeout"],
      })
      .promise();

    // console.log(processQueueAttributes);
    const visibilityTimeout: number = +processQueueAttributes!.Attributes!
      .VisibilityTimeout;
    expect(
      visibilityTimeout,
      "To_Be_Processed_Queue 300 seconds VisibilityTimeout."
    ).to.equal(300);
  });

  it("should have Error Topic with Error_Queue subscription. ", async () => {
    const topics: SNS.Types.ListTopicsResponse = await sns
      .listTopics()
      .promise();

    const errorTopicArn = topics!.Topics!.find((c) =>
      c.TopicArn!.endsWith("ErrorTopic")
    )!.TopicArn;
    expect(errorTopicArn, "Error Topic exists.").to.be.exist;

    const subscriptions = await sns
      .listSubscriptionsByTopic({ TopicArn: errorTopicArn! })
      .promise();
    const errorQueueSubscription = subscriptions!.Subscriptions!.find(
      (c) => c.Protocol === "sqs" && c.Endpoint!.endsWith("Error_Queue")
    );

    expect(errorQueueSubscription, "Error Queue Subscription exists.").to.be
      .exist;
  });
});
