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
import {BillingMode, StreamViewType} from "@aws-cdk/aws-dynamodb";

export class CdkStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // dynamodb table
    const table = new dynamodb.Table(this, "Table", {
      billingMode: BillingMode.PayPerRequest,
      sseEnabled: true,
      streamSpecification: StreamViewType.NewAndOldImages, // to enable global tables
      partitionKey: {name: "key", type: dynamodb.AttributeType.String},
      sortKey: {name: "range", type: dynamodb.AttributeType.Number},
      pitrEnabled: true, // turn on point in time recovery

    });

    // lambda function
    const apiFunction = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NodeJS810,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/dist/packed"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // let the lambda have full access to the table
    table.grantFullAccess(apiFunction.role);

    // api
    new apigateway.LambdaRestApi(this, id + "-API", {
      handler: apiFunction,
      proxy: true,
    });

  }
}
