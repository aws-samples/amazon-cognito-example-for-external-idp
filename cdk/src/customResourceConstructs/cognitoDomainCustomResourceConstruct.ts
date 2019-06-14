import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/cdk");
import iam = require("@aws-cdk/aws-iam");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {Construct} from "@aws-cdk/cdk";
import {CfnUserPool} from "@aws-cdk/aws-cognito";
import {PolicyStatementEffect} from "@aws-cdk/aws-iam";
import {CreateUserPoolDomainRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";


export class CognitoDomainCustomResourceConstruct extends cdk.Construct {

  public domain: string;
  public region: string;
  public readonly lambda: FunctionBase;

  constructor(scope: Construct, id: string, props: Omit<CreateUserPoolDomainRequest, "UserPoolId">, userPool: CfnUserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    this.lambda = new lambda.SingletonFunction(this, "CognitoDomainCustomResource", {
      uuid: "090E4EFC-161E-4EBD-ADA2-72A7BE4A3120",
      code: Code.asset("./dist/customResourceLambdas"),
      handler: "cognitoDomainCustomResourceHandler.handler",
      timeout: 300,
      runtime: lambda.Runtime.NodeJS810,

    });

    const customResourceLambdaPolicy = new iam.PolicyStatement(PolicyStatementEffect.Allow);
    customResourceLambdaPolicy.addAction("cognito-idp:*UserPoolDomain").addResource(userPool.userPoolArn);
    customResourceLambdaPolicy.addAction("cognito-idp:DescribeUserPoolDomain").addResource("*");
    this.lambda.addToRolePolicy(customResourceLambdaPolicy);

    const resource = new cfn.CustomResource(this, "CognitoDomain", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPool.userPoolId}
      }
    });

    this.domain = resource.getAtt("Domain").toString();
    this.region = resource.getAtt("Region").toString();
  }
}
