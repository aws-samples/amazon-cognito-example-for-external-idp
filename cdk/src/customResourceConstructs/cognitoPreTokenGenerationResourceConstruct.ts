import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import {Code, Function, FunctionBase} from "@aws-cdk/aws-lambda";
import {ServicePrincipal} from "@aws-cdk/aws-iam";
import {Duration} from "@aws-cdk/core";
import {CfnUserPool, UserPool} from "@aws-cdk/aws-cognito";
import {CognitoPreTokenGenerationParams} from "../customResourceLambdas/cognitoPreTokenGenerationCustomResourceHandler";

export class CognitoPreTokenGenerationResourceConstruct extends cdk.Construct {

  public readonly lambda: FunctionBase;

  constructor(scope: cdk.Construct, id: string, userPool: CfnUserPool | UserPool, preTokenLambda: Function) {
    super(scope, id);

    this.node.addDependency(userPool);
    this.node.addDependency(preTokenLambda);

    const userPoolArn = userPool instanceof CfnUserPool? userPool.attrArn : userPool.userPoolArn;
    const userPoolId = userPool instanceof CfnUserPool? userPool.ref : userPool.userPoolId;

    preTokenLambda.addPermission("permission", {
      principal : new ServicePrincipal("cognito-idp.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: userPoolArn
    });

    this.lambda = new lambda.SingletonFunction(this, "CognitoPreTokenGenerationCustomResource", {
      uuid: "94418158-75C4-4A49-A10D-38F8096AEE52",
      code: Code.asset("./src/customResourceLambdas"),
      handler: "cognitoPreTokenGenerationCustomResourceHandler.handler",
      timeout: Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_10_X,

    });

    let customResourceLambdaPolicy = new iam.PolicyStatement({
      actions: ["cognito-idp:DescribeUserPool", "cognito-idp:UpdateUserPool"],
      resources: [userPoolArn]
    });

    this.lambda.addToRolePolicy(customResourceLambdaPolicy);

    const props: CognitoPreTokenGenerationParams = {
      PreTokenGenerationLambdaArn: preTokenLambda.functionArn,
      UserPoolId: userPoolId
    };

    new cfn.CustomResource(this, "CognitoPreTokenGeneration", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: props
      }
    });

  }
}
