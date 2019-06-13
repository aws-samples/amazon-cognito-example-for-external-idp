import {CustomResourceHandler, Omit, ResponseData} from "./customResourceHandler";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";

import * as aws from "aws-sdk";
import {UpdateUserPoolRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";

export interface CognitoPreTokenGenerationParams {
  UserPoolId: string;
  PreTokenGenerationLambdaArn?: string;
}


const cognitoIdP = new aws.CognitoIdentityServiceProvider();

export const handler = (new class extends CustomResourceHandler {

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onCreate(event: CloudFormationCustomResourceCreateEvent, _context: Context): Promise<ResponseData> {

    const resourceProperties: CognitoPreTokenGenerationParams = event.ResourceProperties.Props;
    return await this.update(resourceProperties);

  }

// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onDelete(event: CloudFormationCustomResourceDeleteEvent, _context: Context): Promise<ResponseData> {

    //TODO: check if this indeed removes only the PreTokenGeneration lambda
    const resourceProperties: CognitoPreTokenGenerationParams = event.ResourceProperties.Props;
    resourceProperties.PreTokenGenerationLambdaArn = undefined;
    return await this.update(resourceProperties);
  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onUpdate(event: CloudFormationCustomResourceUpdateEvent, _context: Context): Promise<ResponseData> {
    const resourceProperties: CognitoPreTokenGenerationParams = event.ResourceProperties.Props;
    return await this.update(resourceProperties);
  }

  private async update(resourceProperties: CognitoPreTokenGenerationParams) {

    const userPoolId = resourceProperties.UserPoolId;
    const preTokenGenerationLambdaArn = resourceProperties.PreTokenGenerationLambdaArn;

    console.log("Updating PreTokenGeneration lambda", preTokenGenerationLambdaArn);


    let userPoolDesc = await cognitoIdP.describeUserPool({
      UserPoolId: userPoolId
    }).promise();

    let userPool = userPoolDesc.UserPool!;

    // remove attributes not part of the update
    delete userPool.Id;
    delete userPool.Name;
    delete userPool.Status;
    delete userPool.LastModifiedDate;
    delete userPool.CreationDate;
    delete userPool.SchemaAttributes;
    delete userPool.AliasAttributes;
    delete userPool.UsernameAttributes;
    delete userPool.EstimatedNumberOfUsers;
    delete userPool.SmsConfigurationFailure;
    delete userPool.EmailConfigurationFailure;
    delete userPool.Domain;
    delete userPool.CustomDomain;
    delete userPool.Arn;

    // fix for: Please use TemporaryPasswordValidityDays instead of UnusedAccountValidityDays
    if(userPool.Policies && userPool.Policies.PasswordPolicy) {
      const tempPasswordValidityDays = (userPool.Policies.PasswordPolicy as any)["UnusedAccountValidityDays"];
      if(tempPasswordValidityDays) {
        userPool.Policies.PasswordPolicy["TemporaryPasswordValidityDays"] = tempPasswordValidityDays;
      }
    }

    let updateRequest: UpdateUserPoolRequest = {
      UserPoolId: userPoolId,
      ...userPool,
      LambdaConfig: {
        ...userPool.LambdaConfig,
        PreTokenGeneration: preTokenGenerationLambdaArn
      }
    };
    await cognitoIdP.updateUserPool(updateRequest).promise();
    console.log("Updated PreTokenGeneration lambda");

    return {
      physicalResourceId: userPoolId
    };
  }

}).handler;
