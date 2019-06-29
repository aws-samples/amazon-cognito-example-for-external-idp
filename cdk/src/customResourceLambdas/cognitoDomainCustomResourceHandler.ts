import {CustomResourceHandler, ResponseData} from "./customResourceHandler";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";

import * as aws from "aws-sdk";
import {CreateUserPoolDomainRequest, UpdateUserPoolDomainRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";

const cognitoIdP = new aws.CognitoIdentityServiceProvider();
const region = aws.config.region!;

export const handler = (new class extends CustomResourceHandler {

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onCreate(event: CloudFormationCustomResourceCreateEvent, _context: Context): Promise<ResponseData> {

    const createDomainRequest: CreateUserPoolDomainRequest = event.ResourceProperties.Props;

    return await this.create(createDomainRequest);
  }

  private async create(createDomainRequest: CreateUserPoolDomainRequest) {
    const userPoolId = createDomainRequest.UserPoolId;

    await cognitoIdP.createUserPoolDomain(createDomainRequest).promise();

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

    return this.generateReturn(createDomainRequest, userPoolId);
  }

  // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onDelete(event: CloudFormationCustomResourceDeleteEvent, _context: Context): Promise<ResponseData> {

    const createDomainRequest: CreateUserPoolDomainRequest = event.ResourceProperties.Props;

    const userPoolId = createDomainRequest.UserPoolId;


    let domain = createDomainRequest.Domain;
    try {
      const describeUserPoolDomainResult = await cognitoIdP.describeUserPoolDomain({
        Domain: domain,
      }).promise();


      if (describeUserPoolDomainResult.DomainDescription!.Domain) {

        console.log("Domain exists, deleting:", describeUserPoolDomainResult.DomainDescription);

        const deleteUserPoolDomainResponse = await cognitoIdP.deleteUserPoolDomain({
          UserPoolId: userPoolId,
          Domain: domain
        }).promise();
        console.log("Domain deleted");

        await this.waitForDomainToBeDeleted(domain);
      }
    } catch (ex) {
      // if already deleted, we can ignore, otherwise, rethrow
      if (ex.code !== "ResourceNotFoundException") {
        throw ex;
      }
    }

    return this.generateReturn(createDomainRequest, userPoolId);

  }


// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
  async onUpdate(event: CloudFormationCustomResourceUpdateEvent, _context: Context): Promise<ResponseData> {
    //TODO: if domain changed, create, else update
    const createDomainRequest: CreateUserPoolDomainRequest = event.ResourceProperties.Props;
    const oldCreateDomainRequest: CreateUserPoolDomainRequest = event.OldResourceProperties.Props;

    const userPoolId = createDomainRequest.UserPoolId;

    if (createDomainRequest.Domain !== oldCreateDomainRequest.Domain ||
      createDomainRequest.UserPoolId !== oldCreateDomainRequest.UserPoolId) {
      // we need to create a new app client and return a new resource ID as it's not possible to change the above
      // CloudFormation will handle deleting the old resource (this is basically a replace)
      return this.create(createDomainRequest);
    }

    await cognitoIdP.updateUserPoolDomain(createDomainRequest as UpdateUserPoolDomainRequest).promise();

    await this.waitForDomainToBeActive(createDomainRequest);

    return this.generateReturn(createDomainRequest, userPoolId);

  }

  private generateReturn(createDomainRequest: CreateUserPoolDomainRequest, userPoolId: string) {
    return {
      returnValue: {
        Domain: `${createDomainRequest.Domain}.auth.${region}.amazoncognito.com`,
        Region: region
      },
      physicalResourceId: userPoolId + "_domain_" + createDomainRequest.Domain
    };
  }

  private async waitForDomainToBeActive(createDomainRequest: CreateUserPoolDomainRequest) {
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

        } catch (ex) {
          if (ex.code !== "ResourceNotFoundException") {
            reject(ex);
          }
        }

      }, 1000);
    });
  }

  private async waitForDomainToBeDeleted(domain: string) {
    await new Promise<void>((resolve: any, reject: any) => {
      const x = setInterval(async () => {
        try {
          const describeUserPoolDomainResult = await cognitoIdP.describeUserPoolDomain({
            Domain: domain,
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

        } catch (ex) {
          if (ex.code === "ResourceNotFoundException") {
            // if already deleted, we can ignore
            resolve();
          } else {
            console.log("Error deleting domain", ex);
            reject(ex);
          }

        }

      }, 1000);
    });
  }

}).handler;
