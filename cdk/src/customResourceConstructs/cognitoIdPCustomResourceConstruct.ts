import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {Construct, Duration} from "@aws-cdk/core";
import {CfnUserPool, UserPool} from "@aws-cdk/aws-cognito";
import {CreateIdentityProviderRequestSAML} from "../customResourceLambdas/cognitoIdPCustomResourceHandler";
import {CreateIdentityProviderRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";


export class CognitoIdPCustomResourceConstruct extends cdk.Construct {

  public readonly lambda: FunctionBase;

  constructor(scope: Construct, id: string, props: Omit<CreateIdentityProviderRequest | CreateIdentityProviderRequestSAML, "UserPoolId">,
              userPool: CfnUserPool | UserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    const userPoolArn = userPool instanceof CfnUserPool? userPool.attrArn : userPool.userPoolArn;
    const userPoolId = userPool instanceof CfnUserPool? userPool.ref : userPool.userPoolId;

    this.lambda = new lambda.SingletonFunction(this, "CognitoIdPCustomResource", {
      uuid: "3C33B180-0D96-48BF-8A5E-6FD13B71511E",
      code: Code.asset("./src/customResourceLambdas"),
      handler: "cognitoIdPCustomResourceHandler.handler",
      timeout:  Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_10_X,

    });

    this.lambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ["cognito-idp:*IdentityProvider*"],
      resources: [userPoolArn]
    }));

    const resource = new cfn.CustomResource(this, "CognitoIdP", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPoolId}
      }
    });
  }
}
