import {TokenRevocationHandler} from "./services/amazonCognitoClaimsMiddleware";
import {Request} from "express";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import {Key} from "aws-sdk/clients/dynamodb";
import aws = require("aws-sdk");

export class DynamoDBTokenRevocationHandler implements TokenRevocationHandler {
  private readonly docClient: DocumentClient;

  constructor(private readonly tableName: string,
              private readonly authorizationHeaderName: string = "Authorization",
              private readonly keyAttributeName: string = "token",
              private readonly ttlAttributeName: string = "ttl",
              private readonly ttlInSeconds: number = 2_592_000 /*30 days*/,
              private readonly endpoint?: string) {
    this.docClient = new aws.DynamoDB.DocumentClient(endpoint ? {endpoint} : undefined);

  }

  public async isTokenRevoked(req: Request): Promise<boolean> {

    const token = this.getTokenFromHeader(req);
    const key = this.getKey(token);
    console.log("revokedTokensTableName:", this.tableName);

    try {

      const params = {
        TableName: this.tableName,
        Key: key,
      };

      console.log("params:", params);

      const promiseResult = await this.docClient.get(params).promise();

      console.log("promiseResult.$response:", promiseResult.$response);
      console.log("promiseResult:", promiseResult);

      if (promiseResult.Item) {
        // TODO: choose what to log when a revoked token use has been detected
        // make sure that these are ok to be logged and that you have proper access control on who can access the logs
        // (this can be protected via IAM roles for CloudWatch logs access)

        console.warn("Revoked token attempt for user " + req.username, req.rawHeaders);
        return true;
      }
      return false;
    } catch (ex) {
      console.error("Error checking token revocation: ", ex);
      throw ex;
    }
  }

  public async revokeToken(req: Request) {

    console.log("revokeToken: ", req);

    const token = this.getTokenFromHeader(req);
    const key = this.getKey(token);
    const ttl = this.ttlInSeconds + Math.round(new Date().getTime() / 1000);
    key[this.ttlAttributeName] = ttl as any;
    try {
      await this.docClient.put({
        TableName: this.tableName,
        Item: key,
      }).promise();

      // TODO: make sure username is ok to be logged
      // console.info("Token revoked for user: " + req.username);
    } catch (ex) {
      console.error("Error revoking token: ", ex);
    }
  }

  private getKey(token: string) {
    const key: Key = {};
    key[this.keyAttributeName] = token as any;
    return key;
  }

  private getTokenFromHeader(req: Request) {
    const token = req.header(this.authorizationHeaderName);
    if (!token) {
      throw new Error(`Invalid request - missing token in header: ${this.authorizationHeaderName}`);
    }
    return token;
  }

}
