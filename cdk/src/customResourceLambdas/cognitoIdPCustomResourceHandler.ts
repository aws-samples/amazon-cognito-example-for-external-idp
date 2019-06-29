import {CustomResourceHandler, ResponseData} from "./customResourceHandler";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";

import * as aws from "aws-sdk";
import {CreateIdentityProviderRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";

const cognitoIdP = new aws.CognitoIdentityServiceProvider();

export type CognitoSAMLIdentityProviderDetails = {
  IDPSignout?: "true" | "false",
} & ({ MetadataURL: string } | { MetadataFile: string });

export interface CreateIdentityProviderRequestSAML extends CreateIdentityProviderRequest {

  ProviderType: "SAML",

  ProviderDetails: CognitoSAMLIdentityProviderDetails;

}

export const handler = (new class extends CustomResourceHandler {

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onCreate(event: CloudFormationCustomResourceCreateEvent, _context: Context): Promise<ResponseData> {

    const createIdentityProviderRequest: CreateIdentityProviderRequest = event.ResourceProperties.Props;

    return this.create(createIdentityProviderRequest);

  }

  private async create(createIdentityProviderRequest: CreateIdentityProviderRequest) {
    const returnValue = await cognitoIdP.createIdentityProvider(createIdentityProviderRequest).promise();
    return {
      returnValue: {
        IdentityProviderName: returnValue.IdentityProvider.ProviderName
      },
      physicalResourceId: this.getPhysicalResourceId(createIdentityProviderRequest)
    };
  }

// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onDelete(event: CloudFormationCustomResourceDeleteEvent, _context: Context): Promise<ResponseData> {

    const createIdentityProviderRequest: CreateIdentityProviderRequest = event.ResourceProperties.Props;

    let userPoolAndProvider = {
      ProviderName: createIdentityProviderRequest.ProviderName,
      UserPoolId: createIdentityProviderRequest.UserPoolId
    };

    await cognitoIdP.deleteIdentityProvider(userPoolAndProvider).promise();

    return {
      returnValue: {
        IdentityProviderName: createIdentityProviderRequest.ProviderName
      },
      physicalResourceId: this.getPhysicalResourceId(userPoolAndProvider)
    };
  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onUpdate(event: CloudFormationCustomResourceUpdateEvent, _context: Context): Promise<ResponseData> {
    const createIdentityProviderRequest: CreateIdentityProviderRequest = event.ResourceProperties.Props;
    const oldCreateIdentityProviderRequest: CreateIdentityProviderRequest = event.OldResourceProperties.Props;


    if (createIdentityProviderRequest.ProviderName !== oldCreateIdentityProviderRequest.ProviderName ||
      createIdentityProviderRequest.UserPoolId !== oldCreateIdentityProviderRequest.UserPoolId ||
      createIdentityProviderRequest.ProviderType !== oldCreateIdentityProviderRequest.ProviderType
    ) {
      // we need to create a new IdP as the above attributes can't be updated. CFN will create, then delete the old one.
      return this.create(createIdentityProviderRequest);
    }

    const returnValue = await cognitoIdP.updateIdentityProvider({
      UserPoolId: createIdentityProviderRequest.UserPoolId,
      ProviderName: createIdentityProviderRequest.ProviderName,
      AttributeMapping: createIdentityProviderRequest.AttributeMapping,
      IdpIdentifiers: createIdentityProviderRequest.IdpIdentifiers,
      ProviderDetails: createIdentityProviderRequest.ProviderDetails,

    }).promise();

    return {
      returnValue: {
        IdentityProviderName: returnValue.IdentityProvider.ProviderName
      },
      physicalResourceId: this.getPhysicalResourceId(createIdentityProviderRequest)
    };

  }

  private getPhysicalResourceId(param: { UserPoolId?: string, ProviderName?: string }) {
    return param.UserPoolId + "_idp_" + param.ProviderName;
  }

}).handler;
