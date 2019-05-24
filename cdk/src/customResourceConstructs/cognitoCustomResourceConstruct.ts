import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/cdk");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {
  CognitoCustomResourceParams,
  CognitoCustomResourceResult
} from "../customResourceLambdas/cognitoCustomResourceHandler";

export class CognitoCustomResourceConstruct extends cdk.Construct {

  public readonly response: CognitoCustomResourceResult = {};
  public readonly lambda: FunctionBase;

  constructor(scope: cdk.Construct, id: string, props: CognitoCustomResourceParams) {
    super(scope, id);

    this.lambda = new lambda.SingletonFunction(this, "Singleton", {
      uuid: "EBAA2A90-1BE2-44B4-ADF1-C267F9CD910A",
      code: Code.asset("./dist/customResourceLambdas"),
      handler: "cognitoCustomResourceHandler.handler",
      timeout: 300,
      runtime: lambda.Runtime.NodeJS810,

    });
    const resource = new cfn.CustomResource(this, "Resource", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        CognitoCustomResourceParams: props
      }
    });

    this.response.Domain = resource.getAtt("Domain").toString();
    this.response.AppClientId = resource.getAtt("AppClientId").toString();
    this.response.Region = resource.getAtt("Region").toString();

  }
}
