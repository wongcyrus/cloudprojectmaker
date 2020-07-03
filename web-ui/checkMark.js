const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const querystring = require('querystring');
const cloudProjectMarkerFunction = process.env.CloudProjectMarkerFunction;
const recaptchaSiteKey = process.env.RecaptchaSiteKey;
const recaptchaSercetKey = process.env.RecaptchaSercetKey;
const axios = require('axios');


const extractKeys = rawKey => {
    const accessKeyStartIndex = rawKey.indexOf("aws_access_key_id=") + "aws_access_key_id=".length;
    const accessKeyId = rawKey.substring(accessKeyStartIndex, rawKey.indexOf("aws_secret_access_key=")).replace(/(\r\n|\n|\r)/gm, "");
    const secretKeyStartIndex = rawKey.indexOf("aws_secret_access_key=") + "aws_secret_access_key=".length;
    const secretAccessKey = rawKey.substring(secretKeyStartIndex, rawKey.indexOf("aws_session_token=")).replace(/(\r\n|\n|\r)/gm, "");
    const secretSessionTokenIndex = rawKey.indexOf("aws_session_token=") + "aws_session_token=".length;

    let secretSessionTokenEndIndex = rawKey.indexOf("\r", secretSessionTokenIndex);
    if (secretSessionTokenEndIndex === -1) secretSessionTokenEndIndex = rawKey.length;

    const sessionToken = rawKey.substring(secretSessionTokenIndex, secretSessionTokenEndIndex).replace(/(\r\n|\n|\r)/gm, "");
    console.log({ accessKeyId, secretAccessKey, sessionToken });
    return { accessKeyId, secretAccessKey, sessionToken };
};

exports.lambdaHandler = async(event, context) => {

    console.log(event);
    if (event.requestContext.http.method === "GET") {
        if (!event.queryStringParameters) {

            let recaptcha = '<input type="submit" value="Submit">';
            if (recaptchaSiteKey !== "") {
                recaptcha = `
<script>
   function onSubmit(token) {
     document.getElementById("keyform").submit();
   }
    grecaptcha.ready(function() {
    // do request for recaptcha token
    // response is promise with passed token
        grecaptcha.execute('${recaptchaSiteKey}', {action:'validate_captcha'})
                  .then(function(token) {
            // add token value to form
            document.getElementById('g-recaptcha-response').value = token;
        });
    });   
</script>
<button class="g-recaptcha" 
        data-sitekey="${recaptchaSiteKey}" 
        data-callback='onSubmit' 
        data-action='submit'>Submit</button>
`;
            }
            return {
                "headers": {
                    "Content-Type": " text/html"
                },
                "statusCode": 200,
                "body": `
<!DOCTYPE html>

<html>
    <head>
      <title>Check your project marks</title>
      <script src="https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}"></script>
        <meta charset="utf-8"/>
    </head>
    <body>
        <h2>Check your project marks</h2>
        <form id="keyform" method="POST" action="/">
            <input type="hidden" id="g-recaptcha-response" name="g-recaptcha-response">
            <input type="hidden" name="action" value="validate_captcha">
            <label for="credentials">Credentials:</label><br>
            <textarea id="rawKey" name="rawKey" rows="10" cols="100" required></textarea><br>
            <label for="gradeFunctionParameters">Parameter json:</label><br>
            <textarea id="gradeFunctionParameters" name="gradeFunctionParameters" rows="20" cols="100" required>{}</textarea><br>
            ${recaptcha}
        </form> 
        <footer>
          <p>Developed by <a href="https://www.vtc.edu.hk/admission/en/programme/it114115-higher-diploma-in-cloud-and-data-centre-administration/"> Higher Diploma in Cloud and Data Centre Administration Team.</a></p>
        </footer>
    </body>
</html>
        `,
            };
        }
    }
    else if (event.requestContext.http.method === "POST" && event.isBase64Encoded) {
        const buff = Buffer.from(event.body, 'base64');
        const body = buff.toString('ascii');
        const parameters = querystring.parse(body);

        console.log(parameters);
        const IsJsonString = (str) => {
            try {
                JSON.parse(str);
            }
            catch (e) {
                return false;
            }
            return true;
        };
        if (!IsJsonString(parameters.gradeFunctionParameters)) {
            return {
                "headers": {
                    "Content-Type": "text/html"
                },
                "statusCode": 200,
                "body": `
<!DOCTYPE html>
<html>
    <head>
      <title>Managed AWS Educate Classroom Setup Grader Parameters - Error</title>
    </head>
    <body>
        <h2>Managed AWS Educate Classroom Setup Grader Parameters - Error</h2>
        <h1>Invalid JSON</h1>
         ${parameters.gradeFunctionParameters}
        <footer>
          <p>Developed by <a href="https://www.vtc.edu.hk/admission/en/programme/it114115-higher-diploma-in-cloud-and-data-centre-administration/"> Higher Diploma in Cloud and Data Centre Administration Team.</a></p>
        </footer>
    </body>
</html>
        `,
            };
        }
        if (recaptchaSercetKey !== "") {
            const token =  parameters["g-recaptcha-response"][0];
            let verifyResult = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSercetKey}&response=${token}`);

            console.log(verifyResult);
            if (verifyResult.status !== 200 || !verifyResult.data.success) {
                return {
                    "headers": {
                        "Content-Type": "text/html"
                    },
                    "statusCode": 200,
                    "body": "recaptcha error!",
                };
            }
        }

        parameters.rawKey = parameters.rawKey.replace(/(\r\n|\n|\r)/gm, "");

        const { accessKeyId, secretAccessKey, sessionToken } = extractKeys(parameters.rawKey);
        parameters.aws_access_key = accessKeyId;
        parameters.aws_secret_access_key = secretAccessKey;
        parameters.aws_session_token = sessionToken;

        delete parameters.rawKey;

        parameters.graderParameter = parameters.gradeFunctionParameters;
        delete parameters.gradeFunctionParameters;
        console.log(parameters);

        let params = {
            FunctionName: cloudProjectMarkerFunction,
            Payload: JSON.stringify(parameters),
            InvocationType: "RequestResponse",
        };

        const testResult = await lambda.invoke(params).promise();
        let testReport = JSON.parse(testResult.Payload).testResult;

        return {
            "headers": {
                "Content-Type": "text/html"
            },
            "statusCode": 200,
            "body": testReport,
        };
    }

};
