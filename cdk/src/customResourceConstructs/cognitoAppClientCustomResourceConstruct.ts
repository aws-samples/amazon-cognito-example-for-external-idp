import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/cdk");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {
  CognitoAppClientCustomResourceParams
} from "../customResourceLambdas/cognitoAppClientCustomResourceHandler";
import {CfnUserPool} from "@aws-cdk/aws-cognito";
import iam = require("@aws-cdk/aws-iam");
import {PolicyStatementEffect} from "@aws-cdk/aws-iam";

export class CognitoAppClientCustomResourceConstruct extends cdk.Construct {

  public appClientId: string;
  public readonly lambda: FunctionBase;

  constructor(scope: cdk.Construct, id: string, props: Omit<CognitoAppClientCustomResourceParams, "UserPoolId">, userPool: CfnUserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    this.lambda = new lambda.SingletonFunction(this, "CognitoAppClientCustomResource", {
      uuid: "EBAA2A90-1BE2-44B4-ADF1-C267F9CD910A",
      code: Code.asset("./dist/customResourceLambdas"),
      handler: "cognitoAppClientCustomResourceHandler.handler",
      timeout: 300,
      runtime: lambda.Runtime.NodeJS810,

    });

    //TODO: narrow down permissions and add a convenient method
    let customResourceLambdaPolicy = new iam.PolicyStatement(PolicyStatementEffect.Allow);
    customResourceLambdaPolicy.addAction("cognito-idp:*UserPoolClient*").addResource(userPool.userPoolArn);
    this.lambda.addToRolePolicy(customResourceLambdaPolicy);

    const resource = new cfn.CustomResource(this, "CognitoAppClient", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPool.userPoolId}
      }
    });

    this.appClientId = resource.getAtt("AppClientId").toString();

  }
}
