import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/cdk");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {CognitoPreTokenGenerationParams} from "../customResourceLambdas/cognitoPreTokenGenerationCustomResourceHandler";
import iam = require("@aws-cdk/aws-iam");
import {PolicyStatementEffect} from "@aws-cdk/aws-iam";
import {CfnUserPool} from "@aws-cdk/aws-cognito";
import {Omit} from "../customResourceLambdas/customResourceHandler";

export class CognitoPreTokenGenerationResourceConstruct extends cdk.Construct {

  public readonly lambda: FunctionBase;

  constructor(scope: cdk.Construct, id: string, props: Omit<CognitoPreTokenGenerationParams, "UserPoolId">, userPool: CfnUserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    this.lambda = new lambda.SingletonFunction(this, "CognitoPreTokenGenerationCustomResource", {
      uuid: "94418158-75C4-4A49-A10D-38F8096AEE52",
      code: Code.asset("./dist/customResourceLambdas"),
      handler: "cognitoPreTokenGenerationCustomResourceHandler.handler",
      timeout: 300,
      runtime: lambda.Runtime.NodeJS810,

    });

    //TODO: narrow down permissions and add a convenient method
    let customResourceLambdaPolicy = new iam.PolicyStatement(PolicyStatementEffect.Allow);
    customResourceLambdaPolicy.addAction("cognito-idp:*").addResource(userPool.userPoolArn);
    this.lambda.addToRolePolicy(customResourceLambdaPolicy);

    const resource = new cfn.CustomResource(this, "CognitoPreTokenGeneration", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPool.userPoolId}
      }
    });

  }
}
