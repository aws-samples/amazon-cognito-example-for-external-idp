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

import DynamoDbLocal = require("dynamodb-local");

import AWS = require("aws-sdk");
import {expect} from "chai";
import {RefreshTokenEntry} from "../src/model/refreshTokenEntry";
import {DynamoDBStorageService} from "../src/services/dynamoDBStorageService";

const dynamoLocalPort = 8000;

AWS.config.accessKeyId = "fakeId";
AWS.config.secretAccessKey = "fakeSecret";
AWS.config.region = "us-west-2";

const endpoint = "http://localhost:" + dynamoLocalPort;
const dynamoDB = new AWS.DynamoDB({endpoint});
const tableName = "RefreshTokenEntries";
const db = new DynamoDBStorageService(tableName, endpoint);

// function vs arrow as we want 'this' context, see https://mochajs.org/#arrow-functions
describe("dynamodb table", async function () {

  this.timeout(15000);

  before(async () => {
    await DynamoDbLocal.launch(dynamoLocalPort, null, ["-sharedDb"]);
  });

  after(() => {
    DynamoDbLocal.stop(dynamoLocalPort);
  });

  beforeEach(async () => {
    await dynamoDB.createTable({
      TableName: tableName,
      AttributeDefinitions: [
        {AttributeName: "key", AttributeType: "S"},
      ],
      KeySchema: [
        {AttributeName: "key", KeyType: "HASH"},
      ],
      BillingMode: "PAY_PER_REQUEST",
    }).promise();

  });

  afterEach(async () => {
    await dynamoDB.deleteTable({
      TableName: tableName,
    }).promise();

  });

  it("add and get item", async () => {

    await db.savePet(new RefreshTokenEntry("k1", "t1", Date.now(), "sub1"));
    const refreshTokenEntry = await db.getPet("k1");

    if (refreshTokenEntry) { // for typescript type guards to work
      expect(refreshTokenEntry.key).equals("k1");
      expect(refreshTokenEntry.refreshToken).equals("t1");
    } else {
      expect.fail("refresh token was null or undefined");
    }

  });

  it("add two items with the same key fail", async () => {

    await db.savePet(new RefreshTokenEntry("k1", "t1", Date.now(), "sub1"));

    try {
      await db.savePet(new RefreshTokenEntry("k1", "t2", Date.now(), "sub1"));
      expect.fail("saving the same key twice should have failed");
    } catch (ex) {
      expect(ex.code).equals("ConditionalCheckFailedException");
    }

    const refreshTokenEntry = await db.getPet("k1");
    if (refreshTokenEntry) { // for typescript type guards to work
      expect(refreshTokenEntry.key).equals("k1");
      expect(refreshTokenEntry.refreshToken).equals("t1");
    } else {
      expect.fail("refresh token was null or undefined");
    }
  });

  it("update an item - success", async () => {

    await db.savePet(new RefreshTokenEntry("k1", "t1", Date.now(), "sub1"));

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "1.2.3.4"}, 0, false);

    const refreshTokenEntry = await db.getPet("k1");
    if (refreshTokenEntry) { // for typescript type guards to work
      expect(refreshTokenEntry.accessLog).to.have.length(1);
      expect(refreshTokenEntry.refreshToken).to.equal("t1");
    } else {
      expect.fail("refresh token was null or undefined");
    }

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "6.6.6.6"}, 1, true);

    const refreshTokenEntry2 = await db.getPet("k1");

    if (refreshTokenEntry2) { // for typescript type guards to work
      expect(refreshTokenEntry2.accessLog).to.have.length(2);
      // tslint:disable-next-line:no-unused-expression
      expect(refreshTokenEntry2.refreshToken).to.be.undefined;
    } else {
      expect.fail("refresh token was null or undefined");
    }
  });

  it("update an item - clear token twice", async () => {

    await db.savePet(new RefreshTokenEntry("k1", "t1", Date.now(), "sub1"));

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "1.2.3.4"}, 0, false);

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "6.6.6.6"}, 1, true);
    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "7.7.7.7"}, 2, true);

    const refreshTokenEntry2 = await db.getPet("k1");

    if (refreshTokenEntry2) { // for typescript type guards to work
      expect(refreshTokenEntry2.accessLog).to.have.length(3);
      // tslint:disable-next-line:no-unused-expression
      expect(refreshTokenEntry2.refreshToken).to.be.undefined;
    } else {
      expect.fail("refresh token was null or undefined");

    }
  });

  it("update an item - optimistic lock fail", async () => {

    await db.savePet(new RefreshTokenEntry("k1", "t1", Date.now(), "sub1"));

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "1.2.3.4"}, 0, false);

    await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "6.6.6.6"}, 1, true);

    try {
      await db.updateRefreshTokenEntry("k1", {"X-Forwarded-For": "7.7.7.7"}, 1, true);
      expect.fail("same expected access log size should have failed");
    } catch (ex) {
      expect(ex.code).equals("ConditionalCheckFailedException");
    }
  });

  it("null table null key ", async () => {

    const db2 = new DynamoDBStorageService(null as any, endpoint);

    try {
      await db2.getPet(null as any);
      expect.fail("should have thrown an exception");
    } catch (e) {
    }

  });

});
