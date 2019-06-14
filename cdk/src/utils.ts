import * as aws from "aws-sdk";
import {CloudFormation} from "aws-sdk";
import apigateway = require("@aws-cdk/aws-apigateway");

export class Utils {

  private static readonly cfn = new aws.CloudFormation();

  static async getStackOutputs(stackName: string): Promise<CloudFormation.Output[]> {
    const result = await this.cfn.describeStacks({StackName: stackName}).promise();
    return result.Stacks![0].Outputs!;
  }

  static getEnv(variableName: string, defaultValue?: string) {
    const variable = process.env[variableName];
    if (!variable) {
      if (defaultValue) {
        return defaultValue;
      }
      throw new Error(`${variable} environment variable must be defined`);
    }
    return variable
  }

  static addCorsOptions(apiResource: apigateway.IResource,
                        origin: string = "*",
                        allowCredentials: boolean = false,
                        allowMethods: string = "OPTIONS,GET,PUT,POST,DELETE"
  ) {

    apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          'method.response.header.Access-Control-Allow-Origin': "'" + origin + "'",
          'method.response.header.Access-Control-Allow-Credentials': "'" + allowCredentials.toString() + "'",
          'method.response.header.Access-Control-Allow-Methods': "'" + allowMethods + "'",
        },
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.Never,
      requestTemplates: {
        "application/json": "{\"statusCode\": 200}"
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }]
    })
  }
}


