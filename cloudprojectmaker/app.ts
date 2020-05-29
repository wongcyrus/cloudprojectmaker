import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";

export interface GraderEvent {
  eventString: string;
  eventBool: boolean;
}
interface GraderResult {
  resultString: string;
  resultBool?: boolean;
}

export const lambdaHandler = async (
  event: GraderEvent
): Promise<GraderResult> => {
  console.log(event);
  const queries = JSON.stringify(event.eventString);

  const Mocha = require("mocha");
  const fs = require("fs");
  const path = require("path");

  const mocha = new Mocha();

  var testDir = "tests/";

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

  const waitForTest = () =>
    new Promise((resolve) => {
      mocha
        .reporter("xunit", { output: "/tmp/testspec.xunit.xml" })
        .ui("tdd")
        .asyncOnly(true)
        .run((failures: number) => {
          resolve(failures);
        });
    });

  await waitForTest();
  var data = fs.readFileSync("/tmp/testspec.xunit.xml", "utf8");
  console.log(data);
  return {
    resultBool: true,
    resultString: `Queries: ${queries}`,
  };
};
