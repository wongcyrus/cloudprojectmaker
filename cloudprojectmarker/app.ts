import * as Mocha from "mocha";
import AWS = require("aws-sdk");
import fs = require("fs");
import path = require("path");

const testReportBucket = process.env.TestReportBucket;
console.log(testReportBucket);

export interface GraderEvent {
  aws_access_key?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
  graderParameter?: string;
}
interface GraderResult {
  testResult: string;
}

export const lambdaHandler = async (
  event: GraderEvent
): Promise<GraderResult> => {
  console.log(event);

  const mocha = new Mocha({
    reporter: "mocha-multi-reporters",
    reporterOptions: {
      reporterEnabled: "mochawesome, json",
      mochawesomeReporterOptions: {
        reportDir: "/tmp",
        quiet: true,
      },
    },
  });

  const testDir = "marking/";

  if (event.aws_access_key) {
    AWS.config.update({
      accessKeyId: event.aws_access_key,
      secretAccessKey: event.aws_secret_access_key,
      sessionToken: event.aws_session_token,
      region: "us-east-1",
    });
  }

  // Add each .js file to the mocha instance
  fs.readdirSync(testDir)
    .filter((file: any) => {
      // Only keep the -test.js files
      return file.substr(-8) === "-test.js";
    })
    .forEach((file: any) => {
      //https://github.com/mochajs/mocha/issues/2783
      let _sPathSpec = path.join(path.resolve(), testDir, file);
      // Resetting caches to be able to launch tests multiple times...
      delete require.cache[_sPathSpec];
      mocha.addFile(path.join(testDir, file));
    });
  // mocha.addFile(path.join(testDir, "alb-test.js"));

  mocha.addFile("hook.js");
  process.env.event = JSON.stringify(event);

  if (event.graderParameter) {
    process.env.graderParameter = event.graderParameter;
    const graderParameter = JSON.parse(process.env.graderParameter);
    console.log("graderParameter");
    console.log(graderParameter);
  }

  mocha.retries(3);

  const waitForTest = async () =>
    new Promise((resolve) => {
      let runner = mocha.run((failures: number) => {
        console.log(failures);
        resolve(runner);
      });
    });

  let runner: any = await waitForTest();

  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: "us-east-1",
  });

  const files = getFiles("/tmp/");
  await Promise.all(files.map((c) => uploadFile(c)));

  return {
    testResult: JSON.stringify(runner.testResults),
  };
};

const uploadFile = async (filePathName: string) => {
  var fileBuffer = fs.readFileSync(filePathName);
  var metaData = getContentTypeByFile(filePathName);
  const s3 = new AWS.S3();
  const params = {
    ACL: "public-read",
    Bucket: testReportBucket!,
    Key: filePathName.replace("/tmp//", ""),
    Body: fileBuffer!,
    ContentType: metaData,
  };
  return await s3.putObject(params).promise();
};

const getContentTypeByFile = (fileName: string) => {
  var rc = "application/octet-stream";
  var fileNameLowerCase = fileName.toLowerCase();

  if (fileNameLowerCase.indexOf(".html") >= 0) rc = "text/html";
  else if (fileNameLowerCase.indexOf(".css") >= 0) rc = "text/css";
  else if (fileNameLowerCase.indexOf(".json") >= 0) rc = "application/json";
  else if (fileNameLowerCase.indexOf(".js") >= 0)
    rc = "application/x-javascript";
  else if (fileNameLowerCase.indexOf(".png") >= 0) rc = "image/png";
  else if (fileNameLowerCase.indexOf(".jpg") >= 0) rc = "image/jpg";

  return rc;
};

const getFiles = (dir: string, files_?: string[]) => {
  let fileArray: string[];
  fileArray = [];
  files_ = files_ || fileArray;
  let files = fs.readdirSync(dir);
  for (let i in files) {
    let name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
};
