import { expect } from "chai";
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
import "mocha";
import * as AWS from "aws-sdk";
import { GraderEvent } from "./../app";
import { EC2 } from "aws-sdk";

describe("Batch Process", () => {
  let studentData: GraderEvent;
  const sqs: AWS.SQS = new AWS.SQS();

  before(async () => {
    studentData = JSON.parse(process.env.studentData!);
  });

  it("should have 2 queues. ", async () => {
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
});
