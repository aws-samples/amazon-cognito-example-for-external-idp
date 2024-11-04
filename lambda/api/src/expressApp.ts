import { App } from "./app";
import { DynamoDBStorageService } from "./services/dynamoDBStorageService";
import { DynamoDBForcedSignoutHandler } from "./services/dynamoDBForcedSignoutHandler";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

if (!process.env.ITEMS_TABLE_NAME) {
  throw new Error("Required environment variable ITEMS_TABLE_NAME is missing");
}

if (!process.env.USER_POOL_ID) {
  throw new Error("Required environment variable USER_POOL_ID is missing");
}

if (!process.env.ALLOWED_ORIGIN) {
  throw new Error("Required environment variable ALLOWED_ORIGIN is missing");
}

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient());

export const expressApp = new App({
  cognito: new CognitoIdentityProviderClient(),
  adminsGroupName: process.env.ADMINS_GROUP_NAME || "pet-app-admins",
  usersGroupName: process.env.USERS_GROUP_NAME || "pet-app-users",
  authorizationHeaderName:
    process.env.AUTHORIZATION_HEADER_NAME || "Authorization",
  userPoolId: process.env.USER_POOL_ID,
  forceSignOutHandler: process.env.USERS_TABLE_NAME
    ? new DynamoDBForcedSignoutHandler(
        process.env.USERS_TABLE_NAME,
        ddbDocClient
      )
    : undefined,
  storageService: new DynamoDBStorageService(process.env.ITEMS_TABLE_NAME, ddbDocClient),
  allowedOrigin: process.env.ALLOWED_ORIGIN,
}).expressApp;
