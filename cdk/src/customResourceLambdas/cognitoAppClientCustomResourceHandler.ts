import {CustomResourceHandler, ResponseData} from "./customResourceHandler";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";

import * as aws from "aws-sdk";
import {CreateUserPoolClientRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";

export type CognitoAppClientCustomResourceParams = Omit<CreateUserPoolClientRequest, "SupportedIdentityProviders">
  & { SupportedIdentityProviders: ("COGNITO" | "Facebook" | "Google" | "LoginWithAmazon" | string)[] };


const cognitoIdP = new aws.CognitoIdentityServiceProvider();

export const handler = (new class extends CustomResourceHandler {


  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onCreate(event: CloudFormationCustomResourceCreateEvent, _context: Context): Promise<ResponseData> {

    console.log("onCreate", event.ResourceProperties);

    const createUserPoolClientRequest: CognitoAppClientCustomResourceParams = event.ResourceProperties.Props;

    return await this.create(createUserPoolClientRequest);

  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onDelete(event: CloudFormationCustomResourceDeleteEvent, _context: Context): Promise<ResponseData> {

    console.log("onDelete", event.ResourceProperties);

    const createUserPoolClientRequest: CognitoAppClientCustomResourceParams = event.ResourceProperties.Props;

    const userPoolId = createUserPoolClientRequest.UserPoolId;
    const appClientId = event.PhysicalResourceId;

    try {

      await cognitoIdP.deleteUserPoolClient({
        UserPoolId: userPoolId,
        ClientId: appClientId
      }).promise();

    } catch (error) {
      if (error.code === "ResourceNotFoundException") {
        console.log("not found, ignoring");
      } else {
        throw Error
      }
    }

    return this.generateReturn(appClientId);

  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onUpdate(event: CloudFormationCustomResourceUpdateEvent, _context: Context): Promise<ResponseData> {

    console.log("onUpdate", event.ResourceProperties);

    const createUserPoolClientRequest: CognitoAppClientCustomResourceParams = event.ResourceProperties.Props;
    const oldCreateUserPoolClientRequest: CognitoAppClientCustomResourceParams = event.OldResourceProperties.Props;

    const appClientId = event.PhysicalResourceId;

    if (createUserPoolClientRequest.GenerateSecret !== oldCreateUserPoolClientRequest.GenerateSecret) {
      // we need to create a new app client and return a new resource ID as it's not possible to change the above
      // CloudFormation will handle deleting the old resource (this is basically a replace)
      return this.create(createUserPoolClientRequest);
    }

    delete createUserPoolClientRequest.GenerateSecret; // this is not supported in updates

    this.applySensibleDefaults(createUserPoolClientRequest);

    let updateUserPoolClientResponse = await cognitoIdP.updateUserPoolClient({
      ClientId: appClientId,
      ...createUserPoolClientRequest
    }).promise();

    return this.generateReturn(appClientId);


  }

  private applySensibleDefaults(createUserPoolClientRequest: CognitoAppClientCustomResourceParams) {
    // The parameters are passed as String unfortunately, so we need to convert them
    if (createUserPoolClientRequest.GenerateSecret) {
      createUserPoolClientRequest.GenerateSecret = createUserPoolClientRequest.GenerateSecret as any === "true";
    }
    if (createUserPoolClientRequest.AllowedOAuthFlowsUserPoolClient) {
      createUserPoolClientRequest.AllowedOAuthFlowsUserPoolClient = createUserPoolClientRequest.AllowedOAuthFlowsUserPoolClient as any === "true";
    }
    if (createUserPoolClientRequest.RefreshTokenValidity) {
      createUserPoolClientRequest.RefreshTokenValidity = parseInt(createUserPoolClientRequest.RefreshTokenValidity as any);
    }
    // sensible defaults
    if (!createUserPoolClientRequest.AllowedOAuthFlows) {
      createUserPoolClientRequest.AllowedOAuthFlows = ["code"];
    }
    if (!createUserPoolClientRequest.SupportedIdentityProviders) {
      createUserPoolClientRequest.SupportedIdentityProviders = ["COGNITO"];
    }
  }

  private async create(createUserPoolClientRequest: CognitoAppClientCustomResourceParams) {
    console.log("createUserPoolClientRequest: ", createUserPoolClientRequest);

    this.applySensibleDefaults(createUserPoolClientRequest);

    let createUserPoolClientResponse = await cognitoIdP.createUserPoolClient(
      createUserPoolClientRequest
    ).promise();

    let appClientId = createUserPoolClientResponse.UserPoolClient!.ClientId!;

    console.log("appClientId: " + appClientId);

    return this.generateReturn(appClientId);
  }


  private generateReturn(appClientId: string) {
    return {
      returnValue: {
        AppClientId: appClientId
      },
      physicalResourceId: appClientId
    };
  }
}).handler;
