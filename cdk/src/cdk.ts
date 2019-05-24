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
import iam = require("@aws-cdk/aws-iam");
import {BillingMode, StreamViewType} from "@aws-cdk/aws-dynamodb";

import "source-map-support/register";
import {AuthorizationType} from "@aws-cdk/aws-apigateway";
import {CognitoCustomResourceConstruct} from "./customResourceConstructs/cognitoCustomResourceConstruct";
import {PolicyStatementEffect} from "@aws-cdk/aws-iam";

export class CdkStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    let groupsAttributeName = "ADGroups";

    if (!process.env.COGNITO_DOMAIN_NAME) {
      throw new Error("COGNITO_DOMAIN_NAME environment variable must be defined");
    }

    const userPool = new cognito.CfnUserPool(this, id + "Pool", {
      usernameAttributes: ["email"],
      schema: [{
        name: groupsAttributeName,
        attributeDataType: "String",
        mutable: true,
        required: false
      }]
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
        const apiFunction = new lambda.Function(this, "Function", {
          runtime: lambda.Runtime.NodeJS810,
          handler: "index.handler",
          code: lambda.Code.asset("../lambda/api/dist/packed"),
          environment: {
            TABLE_NAME: table.tableName,
          },
        });

        // let the lambda have full access to the table

        table.grantFullAccess(apiFunction.role!);

        // api

        let api = new apigateway.RestApi(this, id + "API");
        let integration = new apigateway.LambdaIntegration(apiFunction, {
          proxy: true
        });

        let cfnAuthorizer = new apigateway.CfnAuthorizer(this, id, {
          name: "CognitoAuthorizer",
          type: AuthorizationType.Cognito,
          identitySource: "method.request.header.Authorization",
          restApiId: api.restApiId,
          providerArns: [userPool.userPoolArn]
        });


        api.root.addResource("{proxy+}").addMethod("ANY", integration, {
          authorizerId: cfnAuthorizer.authorizerId,
          authorizationType: AuthorizationType.Cognito
        });

    // Pre Token Generation function

    // lambda function
    // noinspection JSUnusedLocalSymbols
    const preTokenGeneration = new lambda.Function(this, "PreTokenGeneration", {
      runtime: lambda.Runtime.NodeJS810,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/pretokengeneration/dist/packed"),
      environment: {
        GROUPS_ATTRIBUTE_NAME: groupsAttributeName,
      },
    });

    const cognitoCustomResources = new CognitoCustomResourceConstruct(this, "CognitoCustomResources", {
      UserPoolId: userPool.userPoolId,
      PreTokenGenerationLambdaArn: preTokenGeneration.functionArn,
      CreateUserPoolDomainRequest: {
        Domain: process.env.COGNITO_DOMAIN_NAME
      },
      CreateUserPoolClientRequest: {
        SupportedIdentityProviders: ["COGNITO"],
        ClientName: "Web",
        AllowedOAuthFlowsUserPoolClient: true,
        AllowedOAuthFlows: ["code"],
        AllowedOAuthScopes: ["phone", "email", "openid"],
        GenerateSecret: false,
        RefreshTokenValidity: 1,
        CallbackURLs: ["http://localhost:3000/"],
        LogoutURLs: ["http://localhost:3000/"],
      },
      // CreateIdentityProviderRequest: {
      //   ProviderType: "SAML",
      //   ProviderName: "okta",
      //   ProviderDetails: {
      //     MetadataURL:""
      //   },
      //   AttributeMapping: {
      //     "groups": groupsAttributeName
      //   }
      // }

    });

    cognitoCustomResources.node.addDependency(userPool);

    let customResourceLambdaPolicy = new iam.PolicyStatement(PolicyStatementEffect.Allow);
    customResourceLambdaPolicy.addAction("cognito-idp:*").addResource(userPool.userPoolArn);
    customResourceLambdaPolicy.addAction("cognito-idp:DescribeUserPoolDomain").addResource("*");
    cognitoCustomResources.lambda.addToRolePolicy(customResourceLambdaPolicy);

    // Publish the custom resource output
    new cdk.CfnOutput(this, "APIUrl", {
      description: "API URL",
      value: api.url
    });
    new cdk.CfnOutput(this, "UserPoolId", {
      description: "UserPool ID",
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, "AppClientId", {
      description: "App Client ID",
      value: cognitoCustomResources.response.AppClientId
    });

    new cdk.CfnOutput(this, "Region", {
      description: "Region",
      value: cognitoCustomResources.response.Region
    });

    new cdk.CfnOutput(this, "CognitoDomain", {
      description: "Cognito Domain",
      value: cognitoCustomResources.response.Domain
    });

  }
}

const app = new cdk.App();
// tslint:disable-next-line:no-unused-expression
new CdkStack(app, "ReInforce2019DemoTest6");

app.run();

