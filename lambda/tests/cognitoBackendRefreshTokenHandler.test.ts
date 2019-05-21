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

import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {expect} from "chai";
import {CognitoLDAPDemoHandler} from "../src/cognitoBackendRefreshTokenHandler";
import {RefreshTokenEntry} from "../src/model/refreshTokenEntry";
import {HttpResponse} from "../src/services/httpService";
import {MockHttpService} from "./helpers/mockHttpService";
import {MockStorageService} from "./helpers/mockStorageService";

describe("lambda handler", () => {

  beforeEach(() => {
    mockStorageService.entries.clear();
  });

  it("GET /test success", async () => {

    // create event
    const event: APIGatewayProxyEvent = generateEvent("/test", "GET");

    // create handler
    const handler = generateHandler({statusCode: 200, isSuccess: true, body: "", headers: {}});

    // simulate request
    const result: APIGatewayProxyResult = await handler(event);

    // assertions
    expect(result.statusCode).equal(200);
  });

  it("OPTIONS /oauth2/token success (multiheader)", async () => {

    // create OPTIONS event
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "OPTIONS");

    // create simulated response (to test multi value header handling)
    const response: HttpResponse = {
      statusCode: 200,
      body: "",
      headers: {
        "foo": "bar",
        "Set-Cookie": [
          "a=b",
        ],
        "multivalHeader": [
          1,
          2,
          3,
        ],
      },
      isSuccess: true,

    };

    // create mock handler
    const handler = generateHandler(response);

    // simulate request
    const result: APIGatewayProxyResult = await handler(event);

    // assertions
    expect(result.headers).deep.equals({
      "foo": "bar",
      "set-cookie": "a=b",
    });

    expect(result.multiValueHeaders).deep.equals({
      "multivalheader": [
        1,
        2,
        3,
      ],
    });

  });

  it("POST /oauth2/token authorization_code grant success", async () => {

    // create a proxy request event for an authorization_code grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=authorization_code&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "code=code123");

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // create the dummy JWT
    const tokenWithSub = createMockJWT(sub);

    // the simulated "real" refresh token that the mock token endpoint will return
    const realRefreshToken = "refreshToken1";

    // create a handler with a pre-defined Cognito TOKEN endpoint response
    const handler = generateHandler({
      statusCode: 200,
      body: JSON.stringify({
        id_token: tokenWithSub,
        access_token: tokenWithSub,
        refresh_token: realRefreshToken,
        expires_in: 3600,
        token_type: "Bearer",
      }, null, 2),
      headers: {},
      isSuccess: true,
    });

    // simulate the request
    const result: APIGatewayProxyResult = await handler(event);

    // assertions
    expect(result.statusCode).equals(200);

    const resultBodyParsed = JSON.parse(result.body);
    const keyFromResponse = resultBodyParsed.refresh_token;

    // the main purpose of this test - to ensure we don't return the real refresh token
    expect(keyFromResponse).not.equals(realRefreshToken);

    // the entry that was supposed to be created storing the refresh token returned from the real TOKEN endpoint
    const refreshTokenEntry = mockStorageService.entries.get(keyFromResponse);

    // ensure that the stored refresh token is the real one (should be obvious, but that's why we have tests)
    expect(refreshTokenEntry!.refreshToken).equals(realRefreshToken);

    // ensure we recorded the sub correctly, (the ! is to assert we believe it's not null)
    expect(refreshTokenEntry!.sub).equals(sub);

  });

  it("POST /oauth2/token refresh_token grant success", async () => {

    // the key the client is passing to our endpoint, this is the surrogate key, not the real refresh token
    const keyFromRequest = "surrogateRefreshToken";

    // the real refresh token
    const realRefreshToken = "realRefreshToken";

    // create a proxy request event for an refresh_token grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=refresh_token&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "refresh_token=" + keyFromRequest);

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // simulate that we already had an authorization code flow and persisted a refresh token for that surrogate key
    mockStorageService.entries.set(keyFromRequest, new RefreshTokenEntry(
      keyFromRequest,
      realRefreshToken,
      Date.now(), sub));

    // create the dummy JWT
    const tokenWithSub = createMockJWT(sub);

    // create a handler with a successful simulated Cognito TOKEN response for a refresh_token grant_type
    const handler = generateHandler({
      statusCode: 200,
      body: JSON.stringify({
        id_token: tokenWithSub,
        access_token: tokenWithSub,
        expires_in: 3600,
        token_type: "Bearer",
      }, null, 2),
      headers: {},
      isSuccess: true,
    });

    // simulate the request
    const result: APIGatewayProxyResult = await handler(event);

    // ensure it was successful
    expect(result.statusCode).equals(200);

    const resultBodyParsed = JSON.parse(result.body);

    // the returned refresh_token (the surrogate key)
    const keyFromResponse = resultBodyParsed.refresh_token;

    // ensure we didn't return the real refresh token
    expect(keyFromResponse).not.equals(realRefreshToken);

  });

  it("POST /oauth2/token refresh_token expired", async () => {

    // the key the client is passing to our endpoint, this is the surrogate key, not the real refresh token
    const keyFromRequest = "surrogateRefreshToken";

    // the real refresh token
    const realRefreshToken = "realRefreshToken";

    // create a proxy request event for an refresh_token grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=refresh_token&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "refresh_token=" + keyFromRequest);

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // simulate that we already had an authorization code flow and persisted a refresh token for that surrogate key
    mockStorageService.entries.set(keyFromRequest, new RefreshTokenEntry(
      keyFromRequest,
      realRefreshToken,
      Date.now(), sub));

    // create a handler with an invalid_grant Cognito TOKEN response for a refresh_token grant_type
    const handler = generateHandler({
      statusCode: 400,
      body: JSON.stringify({error: "invalid_grant"}, null, 2),
      headers: {},
      isSuccess: false,
    });

    // simulate the request
    const result: APIGatewayProxyResult = await handler(event);

    // it should fail and delete the token
    expect(result.statusCode).equals(400);

    // it should forward the invalid_grant error as well (the expected response if the real refresh token expired)
    expect(JSON.parse(result.body)).deep.equals({error: "invalid_grant"});

    // tslint:disable-next-line:no-unused-expression
    expect(mockStorageService.entries.get(keyFromRequest)!.refreshToken).to.be.undefined;

  });

  it("POST /oauth2/token refresh_token non JSON response", async () => {

    // the key the client is passing to our endpoint, this is the surrogate key, not the real refresh token
    const keyFromRequest = "surrogateRefreshToken";

    // the real refresh token
    const realRefreshToken = "realRefreshToken";

    // create a proxy request event for an refresh_token grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=refresh_token&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "refresh_token=" + keyFromRequest);

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // simulate that we already had an authorization code flow and persisted a refresh token for that surrogate key
    mockStorageService.entries.set(keyFromRequest, new RefreshTokenEntry(
      keyFromRequest,
      realRefreshToken,
      Date.now(), sub));

    // create a handler with an invalid response (non JSON)
    const handler = generateHandler({
      statusCode: 400,
      body: "non json response",
      headers: {},
      isSuccess: false,
    });

    // simulate the request
    const result: APIGatewayProxyResult = await handler(event);

    // it should fail and delete the token
    expect(result.statusCode).equals(400);
  });

  it("POST /oauth2/token refresh_token grant - invalid_grant (unknown key)", async () => {

    // create a proxy request event for an refresh_token grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=refresh_token&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "refresh_token=invalidSurrogateRefreshToken");

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // create the dummy JWT
    const tokenWithSub = createMockJWT(sub);

    // create a handler that simulate a successful TOKEN response
    // we do this to test that our own code is the one returning the invalid_grant
    // (even before making the call to the real TOKEN endpoint)
    const handler = generateHandler({
      statusCode: 200,
      body: JSON.stringify({
        id_token: tokenWithSub,
        access_token: tokenWithSub,
        expires_in: 3600,
        token_type: "Bearer",
      }, null, 2),
      headers: {},
      isSuccess: true,

    });

    // simulate the request
    const result: APIGatewayProxyResult = await handler(event);

    // expect an invalid grant, because we don't recognize that token
    expect(result.statusCode).equals(400);

    // ensure error matches the one the TOKEN endpoint would have returned if this was an invalid refresh token
    expect(JSON.parse(result.body)).deep.equals({error: "invalid_grant"});

    // TODO: ensure CORS headers etc are also the same as the real TOKEN endpoint

  });

  it("POST /oauth2/token refresh_token grant - invalid_grant (stolen key / replay attack)", async () => {

    // the key the client is passing to our endpoint, this is the surrogate key, not the real refresh token
    const keyFromRequest = "surrogateRefreshToken";

    // the real refresh token
    const realRefreshToken = "realRefreshToken";

    // create a proxy request event for an refresh_token grant_type request structure
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST",
      "grant_type=refresh_token&" +
      "client_id=client1&" +
      "redirect_uri=https://example.com/oauth2&" +
      "refresh_token=" + keyFromRequest);

    // the calling user's Cognito subject (will be part of a dummy JWT claim)
    const sub = "test123";

    // simulate that we already had an authorization code flow and persisted a refresh token for that surrogate key
    mockStorageService.entries.set(keyFromRequest, new RefreshTokenEntry(
      keyFromRequest,
      realRefreshToken,
      Date.now(), sub));

    // create the dummy JWT
    const tokenWithSub = createMockJWT(sub);

    // create a handler that simulate a successful TOKEN response
    // we do this to test that our own code is the one returning the invalid_grant
    // (even before making the call to the real TOKEN endpoint)
    const handler = generateHandler({
      statusCode: 200,
      body: JSON.stringify({
        id_token: tokenWithSub,
        access_token: tokenWithSub,
        expires_in: 3600,
        token_type: "Bearer",
      }, null, 2),
      headers: {},
      isSuccess: true,
    });

    // we should have just one entry (the one we entered above)
    expect(mockStorageService.entries).to.have.lengthOf(1);

    // the access log should not exist yet
    // tslint:disable-next-line:no-unused-expression
    expect(mockStorageService.entries.get(keyFromRequest)!.accessLog).to.be.empty;

    // simulate request the first time
    const result: APIGatewayProxyResult = await handler(event);

    // we should have a new entry in the database since we used a surrogate key once
    expect(mockStorageService.entries).to.have.lengthOf(2);

    // the access log should have 1 entry for 1 access
    expect(mockStorageService.entries.get(keyFromRequest)!.accessLog).to.have.lengthOf(1);

    // first time should work
    expect(result.statusCode).equals(200);

    // simulate request the second time (a replay attack / stolen surrogate token)
    const result2: APIGatewayProxyResult = await handler(event);

    // no new row should be inserted since it was a replay / stolen key
    expect(mockStorageService.entries).to.have.lengthOf(2);

    // the access log should have 2 entries one for the 1st legit use and 1 for the 2nd replay use
    expect(mockStorageService.entries.get(keyFromRequest)!.accessLog).to.have.lengthOf(2);

    // second time should fail
    expect(result2.statusCode).equals(400);

    // we should get an invalid grant as well here, no extra info for the attacker
    expect(JSON.parse(result2.body)).deep.equals({error: "invalid_grant"});

  });

  it("GET /foo unsupported operation", async () => {

    // invalid operation
    const event: APIGatewayProxyEvent = generateEvent("/foo", "GET");

    // handler that does nothing
    const handler = generateHandler(null as any, undefined, undefined);

    // execute handler
    const result = await handler(event);

    // second time should fail
    expect(result.statusCode).equals(404);

    // we should get an invalid grant as well here, no extra info for the attacker
    expect(JSON.parse(result.body)).deep.equals({error: "unsupported_operation"});

  });

  it("POST /oauth2/token missing cognito domain prefix", async () => {

    // valid operation
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST");

    // handler that does nothing
    const handler = generateHandler({
      body: "",
      isSuccess: false,
      headers: {},
      statusCode: 500,
    }, null as any, "us-west-2");

    // execute handler
    const result = await handler(event);

    // should fail
    expect(result.statusCode).equals(500);

  });

  it("POST /oauth2/token missing cognito region", async () => {

    // valid operation
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST");

    // handler that does nothing
    const handler = generateHandler({
      body: "",
      isSuccess: false,
      headers: {},
      statusCode: 500,
    }, "prefix", null as any);

    // execute handler
    const result = await handler(event);

    // should fail
    expect(result.statusCode).equals(500);

  });

  it("POST /oauth2/token - app client secret", async () => {

    // valid operation
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST", "client_id=123");

    // handler that does nothing
    const handler = generateHandler({
      body: "",
      isSuccess: true,
      headers: {},
      statusCode: 200,
    }, undefined, undefined, "secret");

    // execute handler
    const result = await handler(event);

    // should succeed
    expect(result.statusCode).equals(200);

  });

  it("POST /oauth2/token refresh_token grant type but no refresh_token", async () => {

    // valid operation
    const event: APIGatewayProxyEvent = generateEvent("/oauth2/token", "POST", "grant_type=refresh_token");

    // handler that does nothing
    const handler = generateHandler({
      body: "",
      isSuccess: true,
      headers: {},
      statusCode: 200,
    }, undefined, undefined, "secret");

    // execute handler
    const result = await handler(event);

    // should fail
    expect(result.statusCode).equals(400);

    // ensure the value is invalid_request (missing refresh token)
    expect(JSON.parse(result.body)).deep.equals({error: "invalid_request"});

  });

});

/**
 * Simulate an incoming API Gateway Lambda Proxy Request
 * @param path desired path
 * @param method upper case http method
 * @param body the request's body (json or form data a=b&c=d format)
 */
const generateEvent = (path: string, method: string, body: string = "") => ({
  resource: "/{proxy+}",
  path,
  httpMethod: method.toUpperCase(),
  headers: {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate",
    "cache-control": "no-cache",
    "CloudFront-Forwarded-Proto": "https",
    "CloudFront-Is-Desktop-Viewer": "true",
    "CloudFront-Is-Mobile-Viewer": "false",
    "CloudFront-Is-SmartTV-Viewer": "false",
    "CloudFront-Is-Tablet-Viewer": "false",
    "CloudFront-Viewer-Country": "US",
    "content-type": "application/x-www-form-urlencoded",
    "Host": "dummyAPIId.execute-api.us-east-1.amazonaws.com",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/72.0.3626.109 Safari/537.36",
    "Via": "1.1 d98420743a69852491bbdea73f7680bd.cloudfront.net (CloudFront)",
    "X-Amz-Cf-Id": "pn-PWIJc6thYnZm5P0NMgOUglL1DYtl0gdeJky8tqsg8iS_sgsKD1A==",
    "X-Forwarded-For": "54.240.196.186, 54.182.214.83",
    "X-Forwarded-Port": "443",
    "X-Forwarded-Proto": "https",
  },
  multiValueHeaders: {
    "Accept": [
      "*/*",
    ],
    "Accept-Encoding": [
      "gzip, deflate",
    ],
    "cache-control": [
      "no-cache",
    ],
    "CloudFront-Forwarded-Proto": [
      "https",
    ],
    "CloudFront-Is-Desktop-Viewer": [
      "true",
    ],
    "CloudFront-Is-Mobile-Viewer": [
      "false",
    ],
    "CloudFront-Is-SmartTV-Viewer": [
      "false",
    ],
    "CloudFront-Is-Tablet-Viewer": [
      "false",
    ],
    "CloudFront-Viewer-Country": [
      "US",
    ],
    "": [
      "",
    ],
    "Content-Type": [
      "application/json",
    ],
    "headerName": [
      "headerValue",
    ],
    "Host": [
      "dummyAPIId.execute-api.us-east-1.amazonaws.com",
    ],
    "User-Agent": [
      "PostmanRuntime/2.4.5",
    ],
    "Via": [
      "1.1 d98420743a69852491bbdea73f7680bd.cloudfront.net (CloudFront)",
    ],
    "X-Amz-Cf-Id": [
      "pn-PWIJc6thYnZm5P0NMgOUglL1DYtl0gdeJky8tqsg8iS_sgsKD1A==",
    ],
    "X-Forwarded-For": [
      "54.240.196.186, 54.182.214.83",
    ],
    "X-Forwarded-Port": [
      "443",
    ],
    "X-Forwarded-Proto": [
      "https",
    ],
  },
  queryStringParameters: {
    name: "me",
    multivalueName: "me",
  },
  multiValueQueryStringParameters: {
    name: [
      "me",
    ],
    multivalueName: [
      "you",
      "me",
    ],
  },
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    path: "",
    requestTimeEpoch: 1,
    connectedAt: 0,
    accountId: "12345678912",
    resourceId: "roq9wj",
    stage: "Prod",
    requestId: "deef4878-7910-11e6-8f14-25afc3e9ae33",
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      sourceIp: "192.168.196.186",
      user: null,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/72.0.3626.109 Safari/537.36",
      userArn: null,
    },
    resourcePath: path,
    httpMethod: method.toUpperCase(),
    apiId: "dummyAPIId",
  },
  body,
  isBase64Encoded: false,

});

/**
 * a mock storage service simulating DynamoDB
 */
const mockStorageService = new MockStorageService();

/**
 * generate a mock CognitoToken client
 * @param response
 */
const getMockHttpService = (response: HttpResponse) => new MockHttpService(response);

/**
 * generates a lambda handler with the given
 * @param cognitoTokenResponse
 * @param cognitoDomainPrefix
 * @param cognitoRegion
 * @param appClientSecret optional client secret
 */
const generateHandler =
  (cognitoTokenResponse: HttpResponse,
   cognitoDomainPrefix = "test",
   cognitoRegion = "us-west-2",
   appClientSecret?: string) =>
    (event: APIGatewayProxyEvent, context?: Context) =>
      new CognitoLDAPDemoHandler(
        getMockHttpService(cognitoTokenResponse),
        mockStorageService,
        cognitoDomainPrefix,
        cognitoRegion,
        appClientSecret).handle(event, context);

/**
 * create a dummy JWT claims section that includes the sub (our API saves it with the refresh token for audit)
 * @param sub
 */
const createMockJWT = (sub: string) => {
  // the claim
  const claims = Buffer.from(JSON.stringify({sub})).toString("base64");

  // a "JWT" like structure
  return `header.${claims}.signature`;
};
