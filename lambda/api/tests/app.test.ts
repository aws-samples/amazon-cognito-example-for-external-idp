/* tslint:disable:trailing-comma only-arrow-functions object-literal-shorthand */

import { Context } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminUserGlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  createServer,
  proxy,
  ProxyResult,
  Response,
} from "aws-serverless-express";
import { App } from "../src/app";
import { DynamoDBForcedSignoutHandler } from "../src/services/dynamoDBForcedSignoutHandler";
import { expect } from "chai";
import { Claims } from "../src/services/authorizationMiddleware";
import { Server } from "http";
import { Pet } from "../src/models/pet";
import { DynamoDBStorageService } from "../src/services/dynamoDBStorageService";

/**
 * An example integration test that can check authorization logic based on mock claims
 */
describe("integration test", async () => {
  const user1 = "user1";
  const user2 = "user2";
  const user1DisplayName = "User One";
  const user2DisplayName = "User Two";
  const itemsTableName = "Pets";
  const itemsTable = new Map<string, Pet>();

  const usersTableName = "Users";
  const usersTable = new Map<
    string,
    { username: string; ttl: number; lastForceSignOutTime: number }
  >();
  const origin = "http://localhost:3000";

  const adminsGroupName = "pet-app-admins";
  const usersGroupName = "pet-app-users";

  let server: Server;
  let handler: (event: any, context: Context) => ProxyResult;

  before(() => {
    server = createServer(mockApp.expressApp);
    handler = (event: any, context: Context) =>
      proxy(server, event, context, "PROMISE");
    itemsTable.set("p1", new Pet("p1", "cat", 10, user1, user1DisplayName));
    itemsTable.set("p2", new Pet("p2", "dog", 10, user2, user2DisplayName));
  });

  after(() => {
    server.close();
  });

  it("test get allowed paths with no auth", async () => {
    const response: Response = await request("/", "GET");

    expect(response.statusCode).to.equal(200);
  });

  it("test get all pets as admin", async () => {
    const response: Response = await request("/pets", "GET", {
      username: user1,
      token_use: "access",
      "cognito:groups": [usersGroupName, adminsGroupName],
    });

    const pets = JSON.parse(response.body) as any[];

    expect(pets).to.have.lengthOf(itemsTable.size);
  });

  it("test get only owned pets as user", async () => {
    const response: Response = await request("/pets", "GET", {
      username: user1,
      token_use: "access",
      name: "User",
      family_name: "One",
      "cognito:groups": [usersGroupName],
    });

    const pets = JSON.parse(response.body) as any[];

    expect(pets).to.have.lengthOf(1);
    expect(pets[0]).to.eql(itemsTable.get("p1"));
  });

  it("test update other's pet not as owner - admin", async () => {
    const response: Response = await request(
      "/pets/p2",
      "PUT",
      {
        username: user1,
        token_use: "access",
        "cognito:groups": [usersGroupName, adminsGroupName],
      },
      itemsTable.get("p2")
    );

    expect(response.statusCode).to.equal(200);
  });

  it("test update other's pet not as owner - regular user", async () => {
    const response: Response = await request(
      "/pets/p2",
      "PUT",
      {
        username: user1,
        token_use: "access",
        "cognito:groups": [usersGroupName],
      },
      itemsTable.get("p2")
    );

    expect(response.statusCode).to.equal(403);
  });

  it("test no relevant groups", async () => {
    const response: Response = await request("/pets", "GET", {
      username: user1,
      token_use: "access",
      "cognito:groups": ["other"],
    });
    expect(response.statusCode).to.equal(403);
  });

  it("test no groups", async () => {
    const response: Response = await request("/pets", "GET", {
      username: user1,
      token_use: "access",
      "cognito:groups": [],
    });
    expect(response.statusCode).to.equal(403);
  });

  it("test null groups", async () => {
    const response: Response = await request("/pets", "GET", {
      username: user1,
      token_use: "access",
    });
    expect(response.statusCode).to.equal(403);
  });

  it("test force sign out", async () => {
    const iat = Date.now() / 1000 - 1;
    const claims: Partial<Claims> = {
      username: user1,
      token_use: "access",
      "cognito:groups": [usersGroupName],
      iat: iat, // token was issued a minute ago
    };

    // first request, should succeed
    const response0 = await request("/pets", "GET", claims);
    expect(response0.statusCode).to.equal(200);

    // second, forceSignOut, should succeed
    const response1 = await request("/forceSignOut", "POST", claims);
    expect(response1.statusCode).to.equal(200);

    // should fail because we are after forceSignOut and our token is "old"
    const response2 = await request("/pets", "GET", claims);
    expect(response2.statusCode).to.equal(401);

    // should succeed because this is a different user
    const response3 = await request("/pets", "GET", {
      ...claims,
      username: user2,
    });
    expect(response3.statusCode).to.equal(200);

    // FF to the future, user logged in again, got a new token, should succeed
    const response4 = await request("/pets", "GET", {
      ...claims,
      iat: Date.now() / 1000 + 1,
    });
    expect(response4.statusCode).to.equal(200);
  });

  const request = async (
    path: string,
    method: string,
    claims: Partial<Claims> = {},
    body?: object
  ) => {
    const tokenBase64 = Buffer.from(JSON.stringify(claims)).toString("base64");

    const eventAndContext = {
      event: {
        resource: "/{proxy+}",
        path: path,
        httpMethod: method,
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: `header.${tokenBase64}.signature`,
          Host: "xyz.execute-api.xx-xxxx-x.amazonaws.com",
          origin: origin,
          Referer: origin + "/",
          "User-Agent": "UserAgent",
        },
        multiValueHeaders: {
          Accept: ["*/*"],
          "Content-Type": ["application/json"],
          Authorization: [`header.${tokenBase64}.signature`],
          Host: ["xyz.execute-api.xx-xxxx-x.amazonaws.com"],
          origin: [origin],
          Referer: [origin + "/"],
          "User-Agent": ["UserAgent"],
        },
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: { proxy: "pets" },
        stageVariables: null,
        requestContext: {
          resourcePath: "/{proxy+}",
          httpMethod: method,
          path: "/prod" + path,
          identity: {},
          domainName: "xyz.execute-api.xx-xxxx-x.amazonaws.com",
          apiId: "xyz",
        },
        isBase64Encoded: false,
      },
      context: {
        callbackWaitsForEmptyEventLoop: true,
        getRemainingTimeInMillis(): number {
          return 1000;
        },
        done(error?: Error, result?: any): void {
          console.log("done", error, result);
        },
        fail(error: Error | string): void {
          console.log("fail", error);
        },
        succeed(messageOrObject: any): void {
          console.log("succeed", messageOrObject);
        },
      },
    };

    if (body) {
      (eventAndContext.event as any).body = JSON.stringify(body);
    }

    return handler(eventAndContext.event, eventAndContext.context as any)
      .promise;
  };

  const mockApp = new App({
    cognito: {
      send: async (command: AdminUserGlobalSignOutCommand) => {
        return Promise.resolve({});
      },
    } as unknown as CognitoIdentityProviderClient,
    adminsGroupName: adminsGroupName,
    usersGroupName: usersGroupName,
    authorizationHeaderName: "Authorization",
    userPoolId: "pool1",
    forceSignOutHandler: new DynamoDBForcedSignoutHandler(usersTableName, {
      send: async (command: GetItemCommand | PutItemCommand) => {
        if (command instanceof GetItemCommand) {
          const params = command.input;
          // Add null check for username
          const username = params.Key?.username?.S;
          if (!username) {
            throw new Error("Username is required");
          }
          const item = usersTable.get(username);
          return Promise.resolve(item ? { Item: item } : {});
        } else if (command instanceof PutItemCommand) {
          const params = command.input;
          const username = params.Item?.username?.S;
          if (!username) {
            throw new Error("Username is required");
          }
          usersTable.set(username, params.Item as any);
          return Promise.resolve({});
        }
      },
    } as unknown as DynamoDBClient),
    storageService: new DynamoDBStorageService(itemsTableName, {
      send: async (command: GetItemCommand | PutItemCommand | ScanCommand) => {
        if (command instanceof GetItemCommand) {
          const params = command.input;
          const id = params.Key?.id?.S;
          if (!id) {
            throw new Error("Id is required");
          }
          const item = itemsTable.get(id);
          return Promise.resolve(item ? { Item: item } : {});
        } else if (command instanceof PutItemCommand) {
          const params = command.input;
          const id = params.Item?.id?.S;
          if (!id) {
            throw new Error("Id is required");
          }
          itemsTable.set(id, params.Item as any);
          return Promise.resolve({});
        } else if (command instanceof ScanCommand) {
          return Promise.resolve({
            Items: [...itemsTable.values()],
          });
        }
      },
    } as unknown as DynamoDBClient),
    allowedOrigin: origin,
  });
});
