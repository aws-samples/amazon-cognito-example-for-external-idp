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

import AWS = require("aws-sdk");
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {StorageService} from "./storageService";
import {Pet} from "../model/pet";
import {ScanInput} from "aws-sdk/clients/dynamodb";

export class DynamoDBStorageService implements StorageService {

  private readonly docClient: DocumentClient;

  constructor(private readonly tableName: string, endpoint?: string) {

    this.docClient = new AWS.DynamoDB.DocumentClient(endpoint ? {endpoint} : undefined);
  }

  public async getPet(key: string): Promise<Pet | undefined> {

    try {
      const data = await this.docClient.get({
        TableName: this.tableName,
        Key: {
          key,
        },
        ConsistentRead: true,

      }).promise();

      return data.Item as Pet;
    } catch (ex) { // AWSError
      console.warn("Error getting entry", ex);
      throw ex;
    }
  }

  public async savePet(pet: Pet): Promise<void> {
    try {
      await this.docClient.put({
        TableName: this.tableName,
        Item: pet,
      }).promise();
    } catch (ex) {
      console.warn("Error saving entry", ex);
      throw ex;
    }
  }

  async getAllPets(): Promise<Pet[]> {
    try {

      const result: Pet[] = [];

      const params: ScanInput = {TableName: this.tableName};

      while (true) {

        const data = await this.docClient.scan(params).promise();
        result.push(...data.Items as Pet[]);

        if (!data.LastEvaluatedKey) {
          break;
        }

        params.ExclusiveStartKey = data.LastEvaluatedKey;

      }

      return result;
    } catch (ex) { // AWSError
      console.warn("Error getting entry", ex);
      throw ex;
    }

  }

}
