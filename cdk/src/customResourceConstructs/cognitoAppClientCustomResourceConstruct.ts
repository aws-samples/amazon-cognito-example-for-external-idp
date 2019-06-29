import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {CognitoAppClientCustomResourceParams} from "../customResourceLambdas/cognitoAppClientCustomResourceHandler";
import {CfnUserPool, UserPool} from "@aws-cdk/aws-cognito";
import {Duration} from "@aws-cdk/core";

export class CognitoAppClientCustomResourceConstruct extends cdk.Construct {

  public appClientId: string;
  public readonly lambda: FunctionBase;

  constructor(scope: cdk.Construct, id: string, props: Omit<CognitoAppClientCustomResourceParams, "UserPoolId">, userPool: CfnUserPool | UserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    const userPoolArn = userPool instanceof CfnUserPool? userPool.attrArn : userPool.userPoolArn;
    const userPoolId = userPool instanceof CfnUserPool? userPool.ref : userPool.userPoolId;

    this.lambda = new lambda.SingletonFunction(this, "CognitoAppClientCustomResource", {
      uuid: "EBAA2A90-1BE2-44B4-ADF1-C267F9CD910A",
      code: Code.asset("./src/customResourceLambdas"),
      handler: "cognitoAppClientCustomResourceHandler.handler",
      timeout: Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_10_X,

    });

    this.lambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["cognito-idp:*UserPoolClient*"],
      resources: ["*"] // needed in case the user pool has changed, we may have more than one
    }));


    const resource = new cfn.CustomResource(this, "CognitoAppClient", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPoolId}
      }
    });

    this.appClientId = resource.getAtt("AppClientId").toString();

  }
}
