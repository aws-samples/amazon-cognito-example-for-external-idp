import {CustomResourceHandler} from "./customResourceHandler";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";

import * as aws from "aws-sdk";
import {
  CreateIdentityProviderRequest,
  CreateUserPoolClientRequest,
  CreateUserPoolDomainRequest,
  Types as CognitoTypes
} from "aws-sdk/clients/cognitoidentityserviceprovider";

// //see bottom of https://www.typescriptlang.org/docs/handbook/advanced-types.html
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;


export interface CognitoCustomResourceParams {
  UserPoolId: string;
  CreateUserPoolClientRequest?: Omit<CreateUserPoolClientRequest, "UserPoolId" | "SupportedIdentityProviders">
    & { SupportedIdentityProviders: ("COGNITO" | "Facebook" | "Google" | "LoginWithAmazon" | string)[] };
  CreateUserPoolDomainRequest?: Omit<CreateUserPoolDomainRequest, "UserPoolId">;
  CreateIdentityProviderRequest?: Omit<CreateIdentityProviderRequest, "UserPoolId">;
  PreTokenGenerationLambdaArn?: string;
}

export type CognitoCustomResourceResult = {
  Domain?: string //Domain: '{domain}.auth.{region}.amazoncognito.com',
  AppClientId?: string;
  Region?: string;
}

const cognitoIdP = new aws.CognitoIdentityServiceProvider();
const region = aws.config.region!;

export const handler = (new class extends CustomResourceHandler<CognitoCustomResourceResult> {


  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onCreate(event: CloudFormationCustomResourceCreateEvent, _context: Context): Promise<CognitoCustomResourceResult> {

    console.log("onCreate called. Region: " + region);
    const result: CognitoCustomResourceResult = {
      Region: region
    };

    const resourceProperties: CognitoCustomResourceParams = event.ResourceProperties.CognitoCustomResourceParams;

    console.log("resourceProperties: ", resourceProperties);

    const userPoolId = resourceProperties.UserPoolId;

    const createUserPoolClientRequest = resourceProperties.CreateUserPoolClientRequest;
    const createDomainRequest = resourceProperties.CreateUserPoolDomainRequest;
    const createIdentityProviderRequest = resourceProperties.CreateIdentityProviderRequest;
    const preTokenGenerationLambdaArn = resourceProperties.PreTokenGenerationLambdaArn;

    if (createUserPoolClientRequest) {
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
    }

    // if we need to create an identity provider
    if (createIdentityProviderRequest) {

      const createIdentityProviderResponse = await cognitoIdP.createIdentityProvider({
        UserPoolId: userPoolId,
        ...createIdentityProviderRequest
      }).promise();

      if (createUserPoolClientRequest) {

        if (!createUserPoolClientRequest.SupportedIdentityProviders) {
          createUserPoolClientRequest.SupportedIdentityProviders = [];
        }

        createUserPoolClientRequest.SupportedIdentityProviders.push(createIdentityProviderResponse.IdentityProvider.ProviderName!);

        // if we create an external IdP, ensures users can't change their own attributes directly
        let scopes = createUserPoolClientRequest.AllowedOAuthScopes || [];
        let indexOfAdminScope = scopes.indexOf("aws.cognito.signin.user.admin");

        if (indexOfAdminScope != -1) {
          scopes.splice(indexOfAdminScope, 1);
        }
      }
    }

    if (createUserPoolClientRequest) {

      // sensible defaults
      if (!createUserPoolClientRequest.AllowedOAuthFlows) {
        createUserPoolClientRequest.AllowedOAuthFlows = ["code"];
      }
      if (!createUserPoolClientRequest.SupportedIdentityProviders) {
        createUserPoolClientRequest.SupportedIdentityProviders = ["COGNITO"];
      }

      let createUserPoolClientResponse = await cognitoIdP.createUserPoolClient({
        UserPoolId: userPoolId,
        ...createUserPoolClientRequest
      }).promise();

      result.AppClientId = createUserPoolClientResponse.UserPoolClient!.ClientId;
    }

    if (createDomainRequest) {
      const createUserPoolDomainResponse = await cognitoIdP.createUserPoolDomain({
        UserPoolId: userPoolId,
        ...createDomainRequest
      }).promise();

      await new Promise<void>((resolve: any, reject: any) => {
        const x = setInterval(async () => {
          try {
            const describeUserPoolDomainResult = await cognitoIdP.describeUserPoolDomain({
              Domain: createDomainRequest.Domain,
            }).promise();

            if (describeUserPoolDomainResult.DomainDescription!.Status === "ACTIVE") {
              clearInterval(x);
              resolve();
            } else if (describeUserPoolDomainResult.DomainDescription!.Status === "FAILED") {
              clearInterval(x);
              reject(new Error("Domain creation failed"));
            }

          } catch (error) {
            reject(error);
          }

        }, 1000);
      });

      result.Domain = `${createDomainRequest.Domain}.auth.${region}.amazoncognito.com`;
    }

    if (preTokenGenerationLambdaArn) {
      console.log("Updating PreTokenGeneration lambda", preTokenGenerationLambdaArn);
      await cognitoIdP.updateUserPool({
        UserPoolId: userPoolId,
        LambdaConfig: {
          PreTokenGeneration: preTokenGenerationLambdaArn
        }
      }).promise();
      console.log("Updated PreTokenGeneration lambda");
    }

    return result;

  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onDelete(event: CloudFormationCustomResourceDeleteEvent, _context: Context): Promise<void> {

    const resourceProperties: CognitoCustomResourceParams = event.ResourceProperties.CognitoCustomResourceParams;

    const userPoolId = resourceProperties.UserPoolId;

    const createUserPoolClientRequest = resourceProperties.CreateUserPoolClientRequest;
    const createDomainClientRequest = resourceProperties.CreateUserPoolDomainRequest;
    const createIdentityProviderRequest = resourceProperties.CreateIdentityProviderRequest;


    if (createDomainClientRequest) {
      const describeUserPoolDomainResult = await cognitoIdP.describeUserPoolDomain({
        Domain: createDomainClientRequest.Domain,
      }).promise();

      if (describeUserPoolDomainResult.DomainDescription !== {} && describeUserPoolDomainResult.DomainDescription) {
        console.log("Domain exists, deleting:", describeUserPoolDomainResult.DomainDescription);

        const deleteUserPoolDomainResponse = await cognitoIdP.deleteUserPoolDomain({
          UserPoolId: userPoolId,
          ...createDomainClientRequest
        }).promise();
        console.log("Domain deleted");


        await new Promise<void>((resolve: any, reject: any) => {
          const x = setInterval(async () => {
            try {

              const describeUserPoolDomainResult = await cognitoIdP.describeUserPoolDomain({
                Domain: createDomainClientRequest.Domain,
              }).promise();

              console.log(describeUserPoolDomainResult.DomainDescription);
              if (!describeUserPoolDomainResult.DomainDescription!.Domain) {
                clearInterval(x);
                console.log("Deleting domain succeeded");
                resolve();
              } else if (describeUserPoolDomainResult.DomainDescription!.Status === "FAILED") {
                clearInterval(x);
                console.log("Deleting domain failed");

                reject(new Error("Domain deletion failed"));
              }

            } catch (error) {
              console.log("Error deleting domain", error);
              reject(error);
            }

          }, 1000);
        });
      }

    }

    if (createUserPoolClientRequest) {

      while (true) {

        const listUserPoolClientsRequest: CognitoTypes.ListUserPoolClientsRequest = {
          UserPoolId: userPoolId
        };

        let describeUserPoolResult = await cognitoIdP.listUserPoolClients(listUserPoolClientsRequest).promise();
        if (describeUserPoolResult.UserPoolClients) {
          const found = describeUserPoolResult.UserPoolClients.find(x => x.ClientName === createUserPoolClientRequest.ClientName);
          if (found && found.ClientId) {

            console.log("about to delete user pool client with id " + found.ClientId);
            let deleteUserPoolClientResponse = await cognitoIdP.deleteUserPoolClient({
              UserPoolId: userPoolId,
              ClientId: found.ClientId
            }).promise();

            console.log("deleted user pool client with id " + found.ClientId);
            break;
          }
        }

        if (!describeUserPoolResult.NextToken) {
          break;
        }

        listUserPoolClientsRequest.NextToken = describeUserPoolResult.NextToken;
      }
    }

    // if we need to create an identity provider
    if (createIdentityProviderRequest) {
      const deleteIdentityProviderResponse = await cognitoIdP.deleteIdentityProvider({
        UserPoolId: userPoolId,
        ...createIdentityProviderRequest
      }).promise();
    }
  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onUpdate(event: CloudFormationCustomResourceUpdateEvent, _context: Context): Promise<CognitoCustomResourceResult> {

    console.log("onCreate called. Region: " + region);
    const result: CognitoCustomResourceResult = {
      Region: region
    };

    const resourceProperties: CognitoCustomResourceParams = event.ResourceProperties.CognitoCustomResourceParams;

    console.log("resourceProperties: ", resourceProperties);

    const userPoolId = resourceProperties.UserPoolId;

    const createUserPoolClientRequest = resourceProperties.CreateUserPoolClientRequest;
    const createDomainRequest = resourceProperties.CreateUserPoolDomainRequest;
    const createIdentityProviderRequest = resourceProperties.CreateIdentityProviderRequest;
    const preTokenGenerationLambdaArn = resourceProperties.PreTokenGenerationLambdaArn;

    if (createUserPoolClientRequest) {
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
    }

    // if we need to create an identity provider
    if (createIdentityProviderRequest) {

      const createIdentityProviderResponse = await cognitoIdP.updateIdentityProvider({
        UserPoolId: userPoolId,
        ...createIdentityProviderRequest
      }).promise();

      if (createUserPoolClientRequest) {

        if (!createUserPoolClientRequest.SupportedIdentityProviders) {
          createUserPoolClientRequest.SupportedIdentityProviders = [];
        }

        createUserPoolClientRequest.SupportedIdentityProviders.push(createIdentityProviderResponse.IdentityProvider.ProviderName!);

        // if we create an external IdP, ensures users can't change their own attributes directly
        let scopes = createUserPoolClientRequest.AllowedOAuthScopes || [];
        let indexOfAdminScope = scopes.indexOf("aws.cognito.signin.user.admin");

        if (indexOfAdminScope != -1) {
          scopes.splice(indexOfAdminScope, 1);
        }
      }
    }

    if (createUserPoolClientRequest) {

      // sensible defaults
      if (!createUserPoolClientRequest.AllowedOAuthFlows) {
        createUserPoolClientRequest.AllowedOAuthFlows = ["code"];
      }
      if (!createUserPoolClientRequest.SupportedIdentityProviders) {
        createUserPoolClientRequest.SupportedIdentityProviders = ["COGNITO"];
      }

        while (true) {

          const listUserPoolClientsRequest: CognitoTypes.ListUserPoolClientsRequest = {
            UserPoolId: userPoolId
          };

          let describeUserPoolResult = await cognitoIdP.listUserPoolClients(listUserPoolClientsRequest).promise();
          if (describeUserPoolResult.UserPoolClients) {
            const found = describeUserPoolResult.UserPoolClients.find(x => x.ClientName === createUserPoolClientRequest.ClientName);
            if (found && found.ClientId) {

              console.log("about to update user pool client with id " + found.ClientId);
              
              let createUserPoolClientResponse = await cognitoIdP.updateUserPoolClient({
                UserPoolId: userPoolId,
                ClientId: found.ClientId,
                ...createUserPoolClientRequest
              }).promise();

              result.AppClientId = createUserPoolClientResponse.UserPoolClient!.ClientId;

              console.log("update user pool client with id " + found.ClientId);
              break;
            }
          }

          if (!describeUserPoolResult.NextToken) {
            break;
          }

          listUserPoolClientsRequest.NextToken = describeUserPoolResult.NextToken;
        }

    }

    if (createDomainRequest) {
      //TODO: delete then recreate

      result.Domain = `${createDomainRequest.Domain}.auth.${region}.amazoncognito.com`;
    }

    if (preTokenGenerationLambdaArn) {
      await cognitoIdP.updateUserPool({
        UserPoolId: userPoolId,
        LambdaConfig: {
          PreTokenGeneration: preTokenGenerationLambdaArn
        }
      });
    }

    return result;
    
    
    
  }
}).handler;
