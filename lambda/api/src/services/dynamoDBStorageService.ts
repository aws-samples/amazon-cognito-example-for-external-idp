
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import {StorageService} from "./storageService";
import {Pet} from "../models/pet";

export class DynamoDBStorageService implements StorageService {

  constructor(private readonly tableName: string,
              private readonly docClient: DynamoDBDocumentClient) {
  }

  public async getPet(id: string): Promise<Pet | null> {

    try {
      const data = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {id},
        ConsistentRead: true,
      }));
      if (data && data.Item) {
        return data.Item as Pet;
      }
      return null; // return null vs undefined
    } catch (ex) { // AWSError
      console.warn("Error getting entry", ex);
      throw ex;
    }
  }

  public async savePet(pet: Pet): Promise<void> {
    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: pet,
      }));
    } catch (ex) {
      console.warn("Error saving entry", ex);
      throw ex;
    }
  }

  public async getAllPets(): Promise<Pet[]> {
    try {

      const result: Pet[] = [];

      const params: ScanCommandInput = {TableName: this.tableName};

      while (true) {

        const data = await this.docClient.send(new ScanCommand(params));
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
      await this.docClient.send(new DeleteCommand({TableName: this.tableName, Key: {id}}));
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
