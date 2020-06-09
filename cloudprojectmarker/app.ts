import { Runner } from "mocha";

const AWS = require('aws-sdk');

export interface GraderEvent {
  aws_access_key?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
}
interface GraderResult {
  testResult: string;
}

export const lambdaHandler = async (
  event: GraderEvent
): Promise<GraderResult> => {
  console.log(event);

  const Mocha = require("mocha");
  const fs = require("fs");
  const path = require("path");

  const mocha = new Mocha({
        reporter: 'json',
        reporterOptions: {
            output: '/tmp/report.json'
        }
    });

  const testDir = "marking/";
  
  if(event.aws_access_key){
    console.log("Cross Account");
    AWS.config.update({
      accessKeyId: event.aws_access_key, 
      secretAccessKey: event.aws_secret_access_key,
      sessionToken:  event.aws_session_token,
      region: 'us-east-1'});
  }
  
  // Add each .js file to the mocha instance
  fs.readdirSync(testDir)
    .filter((file: any) => {
      // Only keep the .js files
      return file.substr(-3) === ".js";
    })
    .forEach((file: any) => {
      mocha.addFile(path.join(testDir, file));
    });

  process.env.studentData = JSON.stringify(event);

  const waitForTest = async () =>
    new Promise((resolve) => {
      let runner = mocha
        .run((failures: number) => {
          console.log(failures);
          resolve(runner);
        });
    });

  let runner:any = await waitForTest();
  return {
    testResult: JSON.stringify(runner.testResults),
  };
};
