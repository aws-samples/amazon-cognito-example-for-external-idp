import {App} from "./app";
import {DynamoDBStorageService} from "./services/dynamoDBStorageService";
import {DynamoDBForcedSignoutHandler} from "./services/dynamoDBForcedSignoutHandler";
import aws = require("aws-sdk");

if (!process.env.ITEMS_TABLE_NAME) {
  throw new Error("Required environment variable ITEMS_TABLE_NAME is missing");
}

if (!process.env.USER_POOL_ID) {
  throw new Error("Required environment variable USER_POOL_ID is missing");
}

if (!process.env.ALLOWED_ORIGIN) {
  throw new Error("Required environment variable ALLOWED_ORIGIN is missing");
}

export const expressApp = new App({
  cognito: new aws.CognitoIdentityServiceProvider(),
  adminsGroupName: process.env.ADMINS_GROUP_NAME || "pet-app-admins",
  usersGroupName: process.env.USERS_GROUP_NAME || "pet-app-users",
  authorizationHeaderName: process.env.AUTHORIZATION_HEADER_NAME || "Authorization",
  userPoolId: process.env.USER_POOL_ID,
  forceSignOutHandler: process.env.USERS_TABLE_NAME ?
    new DynamoDBForcedSignoutHandler(process.env.USERS_TABLE_NAME) : undefined,
  storageService: new DynamoDBStorageService(process.env.ITEMS_TABLE_NAME),
  allowedOrigin: process.env.ALLOWED_ORIGIN,
}).expressApp;
