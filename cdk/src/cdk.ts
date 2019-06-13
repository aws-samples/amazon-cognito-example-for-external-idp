/*
 * Copyright 2019. Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *          http://aws.amazon.com/apache2.0/
 *
 *  or in the "license" file accompanying this file.
 *  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions
 *  and limitations under the License.
 *
 */

import apigateway = require("@aws-cdk/aws-apigateway");
import cdk = require("@aws-cdk/cdk");

import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import cognito = require("@aws-cdk/aws-cognito");
import {BillingMode, StreamViewType} from "@aws-cdk/aws-dynamodb";

import "source-map-support/register";
import {AuthorizationType} from "@aws-cdk/aws-apigateway";
import {CognitoAppClientCustomResourceConstruct} from "./customResourceConstructs/cognitoAppClientCustomResourceConstruct";

import {CfnUserPool} from "@aws-cdk/aws-cognito";
import {CognitoDomainCustomResourceConstruct} from "./customResourceConstructs/cognitoDomainCustomResourceConstruct";
import {CognitoPreTokenGenerationResourceConstruct} from "./customResourceConstructs/cognitoPreTokenGenerationResourceConstruct";
import {CognitoIdPCustomResourceConstruct} from "./customResourceConstructs/cognitoIdPCustomResourceConstruct";
import {AttributeMappingType} from "aws-sdk/clients/cognitoidentityserviceprovider";


import {Utils} from "./utils";
import {Runtime} from "@aws-cdk/aws-lambda";

export class CdkStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domain = Utils.requireFromEnv("COGNITO_DOMAIN_NAME");
    const groupsAttributeName = Utils.requireFromEnv("GROUPS_ATTRIBUTE_NAME");
    const identityProviderName = Utils.requireFromEnv("IDENTITY_PROVIDER_NAME");
    const identityProviderMetadataURL = Utils.requireFromEnv("IDENTITY_PROVIDER_METADATA_URL");

    const nodeRuntime: Runtime = lambda.Runtime.NodeJS810;
    const tokenHeaderName = "Authorization";
    const groupsAttributeClaimName = "custom:" + groupsAttributeName;

    const userPool: CfnUserPool = new cognito.CfnUserPool(this, id + "Pool", {
      usernameAttributes: ["email"],
      schema: [{
        name: groupsAttributeName,
        attributeDataType: "String",
        mutable: true,
        required: false,
      }],
      autoVerifiedAttributes: ["email"]
    });

    // dynamodb table
    const table = new dynamodb.Table(this, "Table", {
      billingMode: BillingMode.PayPerRequest,
      sseEnabled: true,
      streamSpecification: StreamViewType.NewAndOldImages, // to enable global tables
      partitionKey: {name: "key", type: dynamodb.AttributeType.String},
      sortKey: {name: "range", type: dynamodb.AttributeType.Number},

    });

    // lambda function
    const apiFunction = new lambda.Function(this, "APIFunction", {
      runtime: nodeRuntime,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/api/dist/packed"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // let the lambda have full access to the table

    table.grantFullAccess(apiFunction.role!);

    // api

    const api = new apigateway.RestApi(this, id + "API");
    const integration = new apigateway.LambdaIntegration(apiFunction, {
      proxy: true
    });

    const cfnAuthorizer = new apigateway.CfnAuthorizer(this, id, {
      name: "CognitoAuthorizer",
      type: AuthorizationType.Cognito,
      identitySource: "method.request.header." + tokenHeaderName,
      restApiId: api.restApiId,
      providerArns: [userPool.userPoolArn]
    });

    // capture all requests - require authorization

    const proxyResource = api.root.addResource("{proxy+}");
    proxyResource.addMethod("OPTIONS", integration);
    proxyResource.addMethod("ANY", integration, {
      authorizerId: cfnAuthorizer.authorizerId,
      authorizationType: AuthorizationType.Cognito
    });

    // root (/) - no authorization required

    api.root.addMethod("OPTIONS", integration);
    api.root.addMethod("ANY", integration);

    // Pre Token Generation function

    // lambda function
    // noinspection JSUnusedLocalSymbols
    const preTokenGeneration = new lambda.Function(this, "PreTokenGeneration", {
      runtime: nodeRuntime,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/pretokengeneration/dist/src"),
      environment: {
        GROUPS_ATTRIBUTE_NAME: groupsAttributeName,
      },
    });

    const attributeMapping: AttributeMappingType = {
      "email": "email",
      "family_name": "lastName",
      "name": "firstName"
    };
    attributeMapping[groupsAttributeClaimName] = "groups";

    const cognitoIdPConstruct = new CognitoIdPCustomResourceConstruct(this, "CognitoIdP", {
      ProviderName: identityProviderName,
      ProviderDetails: {
        IDPSignout: "true",
        MetadataURL: identityProviderMetadataURL
      },
      ProviderType: "SAML",
      AttributeMapping: attributeMapping
    }, userPool);


    const cognitoAppClient = new CognitoAppClientCustomResourceConstruct(this, "CognitoAppClient", {
      SupportedIdentityProviders: ["COGNITO", identityProviderName],
      ClientName: "Web",
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["phone", "email", "openid"],
      GenerateSecret: false,
      RefreshTokenValidity: 1,
      CallbackURLs: ["http://localhost:3000/"],
      LogoutURLs: ["http://localhost:3000/"],

    }, userPool);

    cognitoAppClient.node.addDependency(cognitoIdPConstruct);

    const cognitoDomain = new CognitoDomainCustomResourceConstruct(this, "CognitoDomain", {
      Domain: domain,
    }, userPool);

    const cognitoPreTokenGen = new CognitoPreTokenGenerationResourceConstruct(this, "CognitoPreTokenGen", {
      PreTokenGenerationLambdaArn: preTokenGeneration.functionArn
    }, userPool);


    // Publish the custom resource output
    new cdk.CfnOutput(this, "APIUrlOutput", {
      description: "API URL",
      value: api.url
    });

    new cdk.CfnOutput(this, "UserPoolIdOutput", {
      description: "UserPool ID",
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, "AppClientIdOutput", {
      description: "App Client ID",
      value: cognitoAppClient.appClientId
    });

    new cdk.CfnOutput(this, "RegionOutput", {
      description: "Region",
      value: cognitoDomain.region
    });

    new cdk.CfnOutput(this, "CognitoDomainOutput", {
      description: "Cognito Domain",
      value: cognitoDomain.domain
    });

  }
}

const app = new cdk.App();

// NOTE: you should explicitly add the region and account for production use.

// tslint:disable-next-line:no-unused-expression

const stackName = Utils.requireFromEnv("STACK_NAME");
const stackAccount = Utils.requireFromEnv("STACK_ACCOUNT");
const stackRegion = Utils.requireFromEnv("STACK_REGION");

// see https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html
// "The AWS CDK team recommends that you explicitly set your account and region using the env property on a stack when you deploy stacks to production."

const cdkStack = new CdkStack(app, stackName, {env: {region: stackRegion, account: stackAccount}});


//TODO: how to extract stack info so we can auto configure the frontend
// just the equivalent of aws cloudformation describe-stacks --stack-name ReInforce2019Demo
