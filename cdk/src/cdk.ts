import apigateway = require("@aws-cdk/aws-apigateway");
import cdk = require("@aws-cdk/core");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import cognito = require("@aws-cdk/aws-cognito");
import iam = require("@aws-cdk/aws-iam");
import {BillingMode, StreamViewType} from "@aws-cdk/aws-dynamodb";
import "source-map-support/register";
import {AuthorizationType} from "@aws-cdk/aws-apigateway";
import {CognitoAppClientCustomResourceConstruct} from "./customResourceConstructs/cognitoAppClientCustomResourceConstruct";
import {CfnUserPool, SignInType, UserPool, UserPoolAttribute} from "@aws-cdk/aws-cognito";
import {CognitoDomainCustomResourceConstruct} from "./customResourceConstructs/cognitoDomainCustomResourceConstruct";
import {CognitoPreTokenGenerationResourceConstruct} from "./customResourceConstructs/cognitoPreTokenGenerationResourceConstruct";
import {CognitoIdPCustomResourceConstruct} from "./customResourceConstructs/cognitoIdPCustomResourceConstruct";
import {AttributeMappingType} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {Utils} from "./utils";
import {Function, Runtime} from "@aws-cdk/aws-lambda";
import {URL} from "url";
import {Duration} from "@aws-cdk/core";
import {CognitoSAMLIdentityProviderDetails} from "./customResourceLambdas/cognitoIdPCustomResourceHandler";

/**
 * Define a CloudFormation stack that creates a serverless application with
 * Amazon Cognito and an external SAML based IdP
 */
export class AmazonCognitoIdPExampleStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================================================
    // Environment variables and constants
    // ========================================================================

    const domain = Utils.getEnv("COGNITO_DOMAIN_NAME");
    const identityProviderName = Utils.getEnv("IDENTITY_PROVIDER_NAME", "");

    const identityProviderMetadataURLOrFile = Utils.getEnv("IDENTITY_PROVIDER_METADATA","");
    const appUrl = Utils.getEnv("APP_URL");
    // validate URL (throws if invalid URL
    new URL(appUrl);

    const callbackURL = appUrl + "/";

    const groupsAttributeName = Utils.getEnv("GROUPS_ATTRIBUTE_NAME", "groups");

    const adminsGroupName = Utils.getEnv("ADMINS_GROUP_NAME", "pet-app-admins");
    const usersGroupName = Utils.getEnv("USERS_GROUP_NAME", "pet-app-users");
    const lambdaMemory = parseInt(Utils.getEnv("LAMBDA_MEMORY", "128"));

    const nodeRuntime: Runtime = lambda.Runtime.NODEJS_10_X;
    const authorizationHeaderName = "Authorization";
    const groupsAttributeClaimName = "custom:" + groupsAttributeName;

    // ========================================================================
    // Resource: Amazon Cognito User Pool
    // ========================================================================

    // Purpose: creates a user directory and allows federation from external IdPs

    // See also:
    // - https://aws.amazon.com/cognito/
    // - https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.CfnIdentityPool.html


    // high level construct
    const userPool: UserPool = new cognito.UserPool(this, id + "Pool", {
      signInType: SignInType.EMAIL,
      autoVerifiedAttributes: [UserPoolAttribute.EMAIL],
    });

    // any properties that are not part of the high level construct can be added using this method
    const userPoolCfn = userPool.node.defaultChild as CfnUserPool;
    userPoolCfn.schema = [{
      name: groupsAttributeName,
      attributeDataType: "String",
      mutable: true,
      required: false,
      stringAttributeConstraints: {
        maxLength: "2000"
      }
    }];

    // ========================================================================
    // Resource: Amazon DynamoDB Table
    // ========================================================================

    // Purpose: serverless, pay as you go, persistent storage for the demo app

    // See also:
    // - https://aws.amazon.com/dynamodb/
    // - https://docs.aws.amazon.com/cdk/api/latest/docs/aws-dynamodb-readme.html

    const itemsTable = new dynamodb.Table(this, "ItemsTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      stream: StreamViewType.NEW_AND_OLD_IMAGES, // to enable global tables
      partitionKey: {name: "id", type: dynamodb.AttributeType.STRING}
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      stream: StreamViewType.NEW_AND_OLD_IMAGES, // to enable global tables
      partitionKey: {name: "username", type: dynamodb.AttributeType.STRING},
      timeToLiveAttribute: "ttl",
    });

    // ========================================================================
    // Resource: AWS Lambda Function - CRUD API Backend
    // ========================================================================

    // Purpose: serverless backend for the demo app, uses express.js

    // See also:
    // - https://aws.amazon.com/lambda/
    // - https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-readme.html

    const apiFunction = new lambda.Function(this, "APIFunction", {
      runtime: nodeRuntime,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/api/dist/src"),
      timeout: Duration.seconds(30),
      memorySize: lambdaMemory,
      environment: {
        ITEMS_TABLE_NAME: itemsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
        ALLOWED_ORIGIN: appUrl,
        ADMINS_GROUP_NAME: adminsGroupName,
        USERS_GROUP_NAME: usersGroupName,
        USER_POOL_ID: userPoolCfn.ref,
        AUTHORIZATION_HEADER_NAME: authorizationHeaderName,
      },
    });

    // grant the lambda full access to the tables (for a high level construct, we have a syntactic sugar way of doing it
    itemsTable.grantReadWriteData(apiFunction.role!);
    usersTable.grantReadWriteData(apiFunction.role!);

    // for Cfn building blocks, we need to create the policy
    // in here we allow us to do a global sign out from the backend, to avoid having to give users a stronger scope
    apiFunction.addToRolePolicy(new iam.PolicyStatement(
      {
        resources: [userPool.userPoolArn],
        actions: ["cognito-idp:AdminUserGlobalSignOut"]
      })
    );


    // ========================================================================
    // Resource: Amazon API Gateway - API endpoints
    // ========================================================================

    // Purpose: create API endpoints and integrate with Amazon Cognito for JWT validation

    // See also:
    // - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html

    // ------------------------------------------------------------------------
    // The API
    // ------------------------------------------------------------------------

    const api = new apigateway.RestApi(this, id + "API");
    const integration = new apigateway.LambdaIntegration(apiFunction, {
      // lambda proxy integration:
      // see https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-create-api-as-simple-proxy
      proxy: true
    });

    // ------------------------------------------------------------------------
    // Cognito Authorizer
    // ------------------------------------------------------------------------

    const cfnAuthorizer = new apigateway.CfnAuthorizer(this, id, {
      name: "CognitoAuthorizer",
      type: AuthorizationType.COGNITO,

      identitySource: "method.request.header." + authorizationHeaderName,
      restApiId: api.restApiId,
      providerArns: [userPool.userPoolArn]
    });

    // ------------------------------------------------------------------------
    // Root (/) - no authorization required
    // ------------------------------------------------------------------------

    const rootResource = api.root;

    rootResource.addMethod("ANY", integration);

    // ------------------------------------------------------------------------
    // All Other Paths (/{proxy+}) - authorization required
    // ------------------------------------------------------------------------

    // all other paths require the cognito authorizer (validates the JWT and passes it to the lambda)

    const proxyResource = rootResource.addResource("{proxy+}");

    const method = proxyResource.addMethod("ANY", integration, {

      authorizer: {authorizerId: cfnAuthorizer.ref},
      authorizationType: AuthorizationType.COGNITO,

    });

    // these few lines demonstrates two things
    // 1. how to add a low level CFN attribute in case it's not in the high level CDK construct
    // 2. by adding a scope to authorizationScopes, API Gateway now expects an access token instead of an ID token

    const cfnMethod = method.node.defaultChild as apigateway.CfnMethod;

    cfnMethod.authorizationScopes = ["openid"];

    // ------------------------------------------------------------------------
    // // add CORS support to all
    // ------------------------------------------------------------------------

    Utils.addCorsOptions(proxyResource, appUrl);
    Utils.addCorsOptions(rootResource, appUrl);

    // ========================================================================
    // Resource: Pre Token Generation function
    // ========================================================================

    // Purpose: map from a custom attribute mapped from SAML, e.g. {..., "custom:groups":"[a,b,c]", ...}
    //          to cognito:groups claim, e.g. {..., "cognito:groups":["a","b","c"], ...}
    //          it can also optionally add roles and preferred_role claims

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html

    const preTokenGeneration: Function = new lambda.Function(this, "PreTokenGeneration", {
      runtime: nodeRuntime,
      handler: "index.handler",
      code: lambda.Code.asset("../lambda/pretokengeneration/dist/src"),
      environment: {
        GROUPS_ATTRIBUTE_CLAIM_NAME: groupsAttributeClaimName,
      },
    });

    new CognitoPreTokenGenerationResourceConstruct(this, "CognitoPreTokenGen", userPool, preTokenGeneration);

    // ========================================================================
    // Resource: Identity Provider Settings
    // ========================================================================

    // Purpose: define the external Identity Provider details, field mappings etc.

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp.html

    // mapping from IdP fields to Cognito attributes (key is cognito attribute, value is mapped field name)
    const attributeMapping: AttributeMappingType = {
      "email": "email",
      "family_name": "lastName",
      "name": "firstName"
    };
    attributeMapping[groupsAttributeClaimName] = "groups";

    const supportedIdentityProviders = ["COGNITO"];
    let cognitoIdPConstruct = null;

    if(identityProviderMetadataURLOrFile && identityProviderName) {
      const providerDetails: CognitoSAMLIdentityProviderDetails = Utils.isURL(identityProviderMetadataURLOrFile) ? {
        MetadataURL: identityProviderMetadataURLOrFile
      } : {
        MetadataFile: identityProviderMetadataURLOrFile
      };

      cognitoIdPConstruct = new CognitoIdPCustomResourceConstruct(this, "CognitoIdP", {
        ProviderName: identityProviderName,
        ProviderDetails: providerDetails,
        ProviderType: "SAML",
        AttributeMapping: attributeMapping
      }, userPool);

      supportedIdentityProviders.push(identityProviderName);
    }

    // ========================================================================
    // Resource: Cognito App Client
    // ========================================================================

    // Purpose: each app needs an app client defined, where app specific details are set, such as redirect URIs

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html



    const cognitoAppClient = new CognitoAppClientCustomResourceConstruct(this, "CognitoAppClient", {
      SupportedIdentityProviders: supportedIdentityProviders,
      ClientName: "Web",
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["phone", "email", "openid", "profile"],
      GenerateSecret: false,
      RefreshTokenValidity: 1,
      //TODO: add your app's prod URLs here
      CallbackURLs: [callbackURL],
      LogoutURLs: [callbackURL],

    }, userPool);

    // we want to make sure we do things in the right order
    if(cognitoIdPConstruct) {
      cognitoAppClient.node.addDependency(cognitoIdPConstruct);
    }

    // ========================================================================
    // Resource: Cognito Auth Domain
    // ========================================================================

    // Purpose: creates / updates the custom subdomain for cognito's hosted UI

    // See also:
    // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html

    const cognitoDomain = new CognitoDomainCustomResourceConstruct(this, "CognitoDomain", {
      Domain: domain,
    }, userPool);

    // ========================================================================
    // Stack Outputs
    // ========================================================================

    // Publish the custom resource output
    new cdk.CfnOutput(this, "APIUrlOutput", {
      description: "API URL",
      value: api.url
    });

    new cdk.CfnOutput(this, "UserPoolIdOutput", {
      description: "UserPool ID",
      value: userPoolCfn.ref
    });

    new cdk.CfnOutput(this, "AppClientIdOutput", {
      description: "App Client ID",
      value: cognitoAppClient.appClientId
    });

    new cdk.CfnOutput(this, "RegionOutput", {
      description: "Region",
      value: cognitoDomain.region
    });

    new cdk.CfnOutput(this, "CognitoDomainOutput", {
      description: "Cognito Domain",
      value: cognitoDomain.domain
    });

    new cdk.CfnOutput(this, "LambdaFunctionName", {
      description: "Lambda Function Name",
      value: apiFunction.functionName
    });
  }
}

// generate the CDK app and stack

const app = new cdk.App();

const stackName = Utils.getEnv("STACK_NAME");
const stackAccount = Utils.getEnv("STACK_ACCOUNT");
const stackRegion = Utils.getEnv("STACK_REGION");


// The AWS CDK team recommends that you explicitly set your account and region using the env property on a stack when
// you deploy stacks to production.
// see https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html

new AmazonCognitoIdPExampleStack(app, stackName, {env: {region: stackRegion, account: stackAccount}});
