/* tslint:disable:max-line-length trailing-comma only-arrow-functions */
/*
 * Copyright 2019. Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *          http://aws.amazon.com/apache2.0/
 *
 *  or in the "license" file accompanying this file.
 *  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions
 *  and limitations under the License.
 *
 */

import Done = Mocha.Done;

import {Context} from "aws-lambda";
import {handler} from "../src";

// function vs arrow as we want 'this' context, see https://mochajs.org/#arrow-functions
// tslint:disable-next-line:only-arrow-functions
/*describe("lambda handler", async function () {

  it("test handler - get pets", function (done: Done) {
    const sampleEvent: { event: any, context: Context } = {
      "event": {
        "resource": "/{proxy+}",
        "path": "/pets",
        "httpMethod": "GET",
        "headers": {
          "Accept": "*!/!*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9,he;q=0.8,pt;q=0.7",
          "Authorization": "eyJraWQiOiJnVTNFdkVLVnU3cnRcL3FscEpHeUNkY1lXUkhsM21QZDBGYlk1c3h6Z3JxND0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoidlJsVnkzNGl2aWFpVzEwcXR1Z19ndyIsInN1YiI6IjBkMWI5Y2ZiLWVmMTUtNDY1ZC05NzIxLTBjMTdkY2JkMGNiOSIsImF1ZCI6IjFxNHI0ajd0bW12ZDZuNG8yczhhaGc2aWlyIiwiY29nbml0bzpncm91cHMiOlsidGVzdCIsInRlc3QyIl0sImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU1OTYxMjkxNywiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tXC91cy13ZXN0LTJfQ3VuVGhsdGJTIiwiY29nbml0bzp1c2VybmFtZSI6IjBkMWI5Y2ZiLWVmMTUtNDY1ZC05NzIxLTBjMTdkY2JkMGNiOSIsImV4cCI6MTU1OTYyMjIxMSwiaWF0IjoxNTU5NjE4NjExLCJlbWFpbCI6ImVyYW5tZWRhQGFtYXpvbi5jb20ifQ.MQQ8EYyLNVKIV0RvgHqXir93g_zXNehadG92VdtYyGDqCEzzK9Vx1lniRZDnWPOFeY1t2GGVNP5rtPvNMGso5SCWwhRg3xizuXtUv9400rlbEApyzx7hiKLC83jRC6YQcJVcWV1nSSxBZhYN53NPGsMKKXPYR1AzCwBoho5Ik2WUEdU2p2N0ARM_t0lVdbnpcNtj9zlxYVxorzmxJHIZqlfZHhYVNf9b-wWE1tjNXShEnybd-Gc3r_L5lVnkVp112A5v0od87jh_ZrV0djX6PcAkmHPqg9r9wyHqafdOdgAffJj6y8Nr25NGg4LFkJp-B3I7oYgbfSNxv0bhJhEEXQ",
          "cache-control": "no-cache",
          "CloudFront-Forwarded-Proto": "https",
          "CloudFront-Is-Desktop-Viewer": "true",
          "CloudFront-Is-Mobile-Viewer": "false",
          "CloudFront-Is-SmartTV-Viewer": "false",
          "CloudFront-Is-Tablet-Viewer": "false",
          "CloudFront-Viewer-Country": "US",
          "dnt": "1",
          "Host": "svtd9m4652.execute-api.us-west-2.amazonaws.com",
          "origin": "http://localhost:3000",
          "pragma": "no-cache",
          "Referer": "http://localhost:3000/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
          "Via": "2.0 8918721f9949345e08455e61518a59ed.cloudfront.net (CloudFront)",
          "X-Amz-Cf-Id": "6bxE1GPr_eEeLN664DAWbTto-uAmPx27wP6cZn7SOQCFQ6NFIkKRbQ==",
          "X-Amzn-Trace-Id": "Root=1-5cf5e435-f4ee8f97939f186d6146455d",
          "X-Forwarded-For": "72.21.196.66, 70.132.32.133",
          "X-Forwarded-Port": "443",
          "X-Forwarded-Proto": "https"
        },
        "multiValueHeaders": {
          "Accept": [
            "*!/!*"
          ],
          "Accept-Encoding": [
            "gzip, deflate, br"
          ],
          "Accept-Language": [
            "en-US,en;q=0.9,he;q=0.8,pt;q=0.7"
          ],
          "Authorization": [
            "eyJraWQiOiJnVTNFdkVLVnU3cnRcL3FscEpHeUNkY1lXUkhsM21QZDBGYlk1c3h6Z3JxND0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoidlJsVnkzNGl2aWFpVzEwcXR1Z19ndyIsInN1YiI6IjBkMWI5Y2ZiLWVmMTUtNDY1ZC05NzIxLTBjMTdkY2JkMGNiOSIsImF1ZCI6IjFxNHI0ajd0bW12ZDZuNG8yczhhaGc2aWlyIiwiY29nbml0bzpncm91cHMiOlsidGVzdCIsInRlc3QyIl0sImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU1OTYxMjkxNywiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tXC91cy13ZXN0LTJfQ3VuVGhsdGJTIiwiY29nbml0bzp1c2VybmFtZSI6IjBkMWI5Y2ZiLWVmMTUtNDY1ZC05NzIxLTBjMTdkY2JkMGNiOSIsImV4cCI6MTU1OTYyMjIxMSwiaWF0IjoxNTU5NjE4NjExLCJlbWFpbCI6ImVyYW5tZWRhQGFtYXpvbi5jb20ifQ.MQQ8EYyLNVKIV0RvgHqXir93g_zXNehadG92VdtYyGDqCEzzK9Vx1lniRZDnWPOFeY1t2GGVNP5rtPvNMGso5SCWwhRg3xizuXtUv9400rlbEApyzx7hiKLC83jRC6YQcJVcWV1nSSxBZhYN53NPGsMKKXPYR1AzCwBoho5Ik2WUEdU2p2N0ARM_t0lVdbnpcNtj9zlxYVxorzmxJHIZqlfZHhYVNf9b-wWE1tjNXShEnybd-Gc3r_L5lVnkVp112A5v0od87jh_ZrV0djX6PcAkmHPqg9r9wyHqafdOdgAffJj6y8Nr25NGg4LFkJp-B3I7oYgbfSNxv0bhJhEEXQ"
          ],
          "cache-control": [
            "no-cache"
          ],
          "CloudFront-Forwarded-Proto": [
            "https"
          ],
          "CloudFront-Is-Desktop-Viewer": [
            "true"
          ],
          "CloudFront-Is-Mobile-Viewer": [
            "false"
          ],
          "CloudFront-Is-SmartTV-Viewer": [
            "false"
          ],
          "CloudFront-Is-Tablet-Viewer": [
            "false"
          ],
          "CloudFront-Viewer-Country": [
            "US"
          ],
          "dnt": [
            "1"
          ],
          "Host": [
            "svtd9m4652.execute-api.us-west-2.amazonaws.com"
          ],
          "origin": [
            "http://localhost:3000"
          ],
          "pragma": [
            "no-cache"
          ],
          "Referer": [
            "http://localhost:3000/"
          ],
          "User-Agent": [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
          ],
          "Via": [
            "2.0 8918721f9949345e08455e61518a59ed.cloudfront.net (CloudFront)"
          ],
          "X-Amz-Cf-Id": [
            "6bxE1GPr_eEeLN664DAWbTto-uAmPx27wP6cZn7SOQCFQ6NFIkKRbQ=="
          ],
          "X-Amzn-Trace-Id": [
            "Root=1-5cf5e435-f4ee8f97939f186d6146455d"
          ],
          "X-Forwarded-For": [
            "72.21.196.66, 70.132.32.133"
          ],
          "X-Forwarded-Port": [
            "443"
          ],
          "X-Forwarded-Proto": [
            "https"
          ]
        },
        "queryStringParameters": null,
        "multiValueQueryStringParameters": null,
        "pathParameters": {
          "proxy": "pets"
        },
        "stageVariables": null,
        "requestContext": {
          "resourceId": "36o8ff",
          "authorizer": {
            "claims": {
              "at_hash": "vRlVy34iviaiW10qtug_gw",
              "sub": "0d1b9cfb-ef15-465d-9721-0c17dcbd0cb9",
              "aud": "1q4r4j7tmmvd6n4o2s8ahg6iir",
              "cognito:groups": "test,test2",
              "email_verified": "true",
              "token_use": "id",
              "auth_time": "1559612917",
              "iss": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_CunThltbS",
              "cognito:username": "0d1b9cfb-ef15-465d-9721-0c17dcbd0cb9",
              "exp": "Tue Jun 04 04:23:31 UTC 2019",
              "iat": "Tue Jun 04 03:23:31 UTC 2019",
              "email": "eranmeda@amazon.com"
            }
          },
          "resourcePath": "/{proxy+}",
          "httpMethod": "GET",
          "extendedRequestId": "avCYZGjXvHcF8XA=",
          "requestTime": "04/Jun/2019:03:23:33 +0000",
          "path": "/prod/pets",
          "accountId": "117107056533",
          "protocol": "HTTP/1.1",
          "stage": "prod",
          "domainPrefix": "svtd9m4652",
          "requestTimeEpoch": 1559618613798,
          "requestId": "221c2d1f-8678-11e9-9113-e106d0dff8d6",
          "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "cognitoIdentityId": null,
            "caller": null,
            "sourceIp": "72.21.196.66",
            "principalOrgId": null,
            "accessKey": null,
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
            "user": null
          },
          "domainName": "svtd9m4652.execute-api.us-west-2.amazonaws.com",
          "apiId": "svtd9m4652"
        },
        "isBase64Encoded": false
      },
      "context": {
        "callbackWaitsForEmptyEventLoop": true,
        "logGroupName": "/aws/lambda/ReInforce2019Demo-APIFunction49CD189B-1VHCWY0LEVUZE",
        "logStreamName": "2019/06/04/[$LATEST]caa214ef8ad74cb99b040e8797ad7ddc",
        "functionName": "ReInforce2019Demo-APIFunction49CD189B-1VHCWY0LEVUZE",
        "memoryLimitInMB": 128,
        "functionVersion": "$LATEST",
        "awsRequestId": "0f44f272-876c-45c4-9683-9df12d4c8390",
        "invokedFunctionArn": "arn:aws:lambda:us-west-2:117107056533:function:ReInforce2019Demo-APIFunction49CD189B-1VHCWY0LEVUZE",
        getRemainingTimeInMillis(): number {
          return 1000;
        },
        done(error?: Error, result?: any): void {
          console.log("done", error, result);
          if (error) {
            done(error);
          } else {
            done();
          }

        },
        fail(error: Error | string): void {
          console.log("fail", error);
          done(error);
        },
        succeed(messageOrObject: any): void {
          console.log("succeed", messageOrObject);
          done();
        }

      }
    };

    const server1 = handler(sampleEvent.event, sampleEvent.context);

  });

})*/
