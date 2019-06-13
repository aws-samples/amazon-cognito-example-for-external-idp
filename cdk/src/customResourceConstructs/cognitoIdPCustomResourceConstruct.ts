import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/cdk");
import iam = require("@aws-cdk/aws-iam");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {Construct} from "@aws-cdk/cdk";
import {CfnUserPool} from "@aws-cdk/aws-cognito";
import {PolicyStatementEffect} from "@aws-cdk/aws-iam";
import {Omit} from "../customResourceLambdas/customResourceHandler";
import {CreateIdentityProviderRequestSAML} from "../customResourceLambdas/cognitoIdPCustomResourceHandler";
import {CreateIdentityProviderRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";


export class CognitoIdPCustomResourceConstruct extends cdk.Construct {

  public readonly lambda: FunctionBase;

  constructor(scope: Construct, id: string, props: Omit<CreateIdentityProviderRequest | CreateIdentityProviderRequestSAML, "UserPoolId">, userPool: CfnUserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    this.lambda = new lambda.SingletonFunction(this, "CognitoIdPCustomResource", {
      uuid: "3C33B180-0D96-48BF-8A5E-6FD13B71511E",
      code: Code.asset("./dist/customResourceLambdas"),
      handler: "cognitoIdPCustomResourceHandler.handler",
      timeout: 300,
      runtime: lambda.Runtime.NodeJS810,

    });

    //TODO: narrow down permissions and add a convenient method
    let customResourceLambdaPolicy = new iam.PolicyStatement(PolicyStatementEffect.Allow);
    customResourceLambdaPolicy.addAction("cognito-idp:*IdentityProvider*").addResource(userPool.userPoolArn);
    this.lambda.addToRolePolicy(customResourceLambdaPolicy);

    const resource = new cfn.CustomResource(this, "CognitoIdP", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPool.userPoolId}
      }
    });
  }
}
