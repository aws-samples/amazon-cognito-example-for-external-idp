import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import {Code, FunctionBase} from "@aws-cdk/aws-lambda";
import {Construct, Duration} from "@aws-cdk/core";
import {CfnUserPool, UserPool} from "@aws-cdk/aws-cognito";
import {CreateUserPoolDomainRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";


export class CognitoDomainCustomResourceConstruct extends cdk.Construct {

  public domain: string;
  public region: string;
  public readonly lambda: FunctionBase;

  constructor(scope: Construct, id: string, props: Omit<CreateUserPoolDomainRequest, "UserPoolId">,
              userPool: CfnUserPool | UserPool) {
    super(scope, id);

    this.node.addDependency(userPool);

    const userPoolArn = userPool instanceof CfnUserPool? userPool.attrArn : userPool.userPoolArn;
    const userPoolId = userPool instanceof CfnUserPool? userPool.ref : userPool.userPoolId;

    this.lambda = new lambda.SingletonFunction(this, "CognitoDomainCustomResource", {
      uuid: "090E4EFC-161E-4EBD-ADA2-72A7BE4A3120",
      code: Code.asset("./src/customResourceLambdas"),
      handler: "cognitoDomainCustomResourceHandler.handler",
      timeout: Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_10_X,

    });

    this.lambda.addToRolePolicy(
      // * is needed in case the user pool has changed, we may have more than one user pool this lambda needs to interact with
      new iam.PolicyStatement({actions: ["cognito-idp:*UserPoolDomain"], resources: [userPoolArn]})
    );
    this.lambda.addToRolePolicy(
      new iam.PolicyStatement({actions: ["cognito-idp:DescribeUserPoolDomain"], resources: ["*"]})
    );

    const resource = new cfn.CustomResource(this, "CognitoDomain", {
      provider: cfn.CustomResourceProvider.lambda(this.lambda),
      properties: {
        Props: {...props, UserPoolId: userPoolId}
      }
    });

    this.domain = resource.getAtt("Domain").toString();
    this.region = resource.getAtt("Region").toString();
  }
}
