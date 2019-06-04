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
import {DynamoDBStorageService} from "../src/services/dynamoDBStorageService";
import {Pet} from "../src/model/pet";

const dynamoLocalPort = 8000;

AWS.config.accessKeyId = "fakeId";
AWS.config.secretAccessKey = "fakeSecret";
AWS.config.region = "us-west-2";

const endpoint = "http://localhost:" + dynamoLocalPort;
const dynamoDB = new AWS.DynamoDB({endpoint});
const tableName = "Pets";
const db = new DynamoDBStorageService(tableName, endpoint);

// function vs arrow as we want 'this' context, see https://mochajs.org/#arrow-functions
// tslint:disable-next-line:only-arrow-functions
describe("dynamodb table", async function () {

  // this.timeout(15000);
  //
  // before(async () => {
  //   await DynamoDbLocal.launch(dynamoLocalPort, null, ["-sharedDb"]);
  // });
  //
  // after(() => {
  //   DynamoDbLocal.stop(dynamoLocalPort);
  // });
  //
  // beforeEach(async () => {
  //   await dynamoDB.createTable({
  //     TableName: tableName,
  //     AttributeDefinitions: [
  //       {AttributeName: "id", AttributeType: "S"},
  //     ],
  //     KeySchema: [
  //       {AttributeName: "id", KeyType: "HASH"},
  //     ],
  //     BillingMode: "PAY_PER_REQUEST",
  //   }).promise();
  //
  // });
  //
  // afterEach(async () => {
  //   await dynamoDB.deleteTable({
  //     TableName: tableName,
  //   }).promise();
  //
  // });
  //
  // it("add and get item", async () => {
  //
  //   await db.savePet(new Pet("p1", "cat", 100));
  //   const pet = await db.getPet("p1");
  //
  //   if (pet) { // for typescript type guards to work
  //     expect(pet.id).equals("p1");
  //     expect(pet.type).equals("cat");
  //     expect(pet.price).equals(100);
  //   } else {
  //     expect.fail("pet was null or undefined");
  //   }
  //
  // });
  //
});
