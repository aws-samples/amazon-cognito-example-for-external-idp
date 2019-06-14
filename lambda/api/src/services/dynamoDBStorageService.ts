import AWS = require("aws-sdk");
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {StorageService} from "./storageService";
import {ScanInput} from "aws-sdk/clients/dynamodb";
import {Pet} from "../model/pet";

export class DynamoDBStorageService implements StorageService {

  private readonly docClient: DocumentClient;

  constructor(private readonly tableName: string, endpoint?: string) {
    this.docClient = new AWS.DynamoDB.DocumentClient(endpoint ? {endpoint} : undefined);
  }

  public async getPet(id: string): Promise<Pet | null> {

    try {
      const data = await this.docClient.get({
        TableName: this.tableName,
        Key: {id},
        ConsistentRead: true,
      }).promise();

      return data.Item as Pet;
    } catch (ex) { // AWSError
      if (ex.code === "ResourceNotFoundException") {
        return null;
      }
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

  public async getAllPets(): Promise<Pet[]> {
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
      console.warn("Error getting all entries", ex);
      throw ex;
    }

  }

  public async deletePet(id: string): Promise<void> {
    try {
      await this.docClient.delete({TableName: this.tableName, Key: {id}}).promise();
    } catch (ex) {
      console.warn("Error deleting entry", ex);
      throw ex;
    }
  }

  public async getAllPetsByOwner(owner: string): Promise<Pet[]> {
    // in a real world scenario this will be probably using a query on a global secondary index (owner)
    // for simplicity of the demo, this will just filter the scanned results

    return (await this.getAllPets()).filter((pet) => pet.owner === owner);
  }

}
