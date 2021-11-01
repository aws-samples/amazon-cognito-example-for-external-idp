import apigateway = require("@aws-cdk/aws-apigateway");
import cdk = require("@aws-cdk/core");
import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import cognito = require("@aws-cdk/aws-cognito");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import cloudfront = require("@aws-cdk/aws-cloudfront");
import {BillingMode, StreamViewType} from "@aws-cdk/aws-dynamodb";
import "source-map-support/register";
import {AuthorizationType} from "@aws-cdk/aws-apigateway";
import {CfnUserPool, CfnUserPoolIdentityProvider, SignInType, UserPool, UserPoolAttribute} from "@aws-cdk/aws-cognito";
import {Utils} from "./utils";
import {Runtime} from "@aws-cdk/aws-lambda";

import {URL} from "url";
import {Duration} from "@aws-cdk/core";
import {Bucket} from "@aws-cdk/aws-s3";
import {CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";

/**
 * Define a CloudFormation stack that creates a serverless application with
 * Amazon Cognito and an external SAML based IdP
 */
export class BackendStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================================================
    // Environment variables and constants
    // ========================================================================

    const domain = Utils.getEnv("COGNITO_DOMAIN_NAME");
    const identityProviderName = Utils.getEnv("IDENTITY_PROVIDER_NAME", "");

    const identityProviderMetadataURLOrFile = Utils.getEnv("IDENTITY_PROVIDER_METADATA", "");

    const identityProviderType = Utils.getEnv("IDENTITY_PROVIDER_TYPE", "");
    const oidcClientId = Utils.getEnv("CLIENT-ID", "");
    const oidcClientSecret = Utils.getEnv("CLIENT_SECRET", "");
    const oidcUserUrl = Utils.getEnv("OIDC-USER", "");
    const oidcMethod = Utils.getEnv("ATTRIBUTES_REQUEST_METHOD", "");

    const appFrontendDeployMode = Utils.getEnv("APP_FRONTEND_DEPLOY_MODE", "");

    const groupsAttributeName = Utils.getEnv("GROUPS_ATTRIBUTE_NAME", "groups");
    const adminsGroupName = Utils.getEnv("ADMINS_GROUP_NAME", "pet-app-admins");
    const usersGroupName = Utils.getEnv("USERS_GROUP_NAME", "pet-app-users");
    const lambdaMemory = parseInt(Utils.getEnv("LAMBDA_MEMORY", "128"));
    const nodeRuntime: Runtime = lambda.Runtime.NODEJS_10_X;
    const authorizationHeaderName = "Authorization";
    const groupsAttributeClaimName = "custom:" + groupsAttributeName;

    // ========================================================================
    // Resource: (optional) S3 bucket / CloudFront distribution
    // ========================================================================

    // Purpose: store the static frontend assets (the app's user interface)

    const isModeS3 = appFrontendDeployMode === "s3";
    const isModeCloudfront = appFrontendDeployMode === "cloudfront";
    let appUrl = Utils.getEnv("APP_URL", "");
    let uiBucketName: string | undefined = undefined;
    let corsOrigin: string | undefined = undefined;
    if (isModeS3 || isModeCloudfront) {

      const uiBucket: Bucket = new s3.Bucket(this, 'UIBucket');
      uiBucketName = uiBucket.bucketName;

      if (isModeS3) {
        // s3 mode, for development / testing only
        appUrl = "https://" + uiBucket.bucketRegionalDomainName + "/index.html";
        corsOrigin = "https://" + uiBucket.bucketRegionalDomainName;
      } else {
        // cloudfront mode
        const distribution = this.createCloudFrontDistribution(uiBucket);

        if (!appUrl) {
          // if appUrl ws not specified, use the distribution URL
          appUrl = "https://" + distribution.domainName;
          corsOrigin = "https://" + distribution.domainName;
        }
      }
    }

    if (!appUrl) {
      // if not s3 or cloudfront, APP_URL must be defined
      throw new Error(`APP_URL environment variable must be defined`);
    }

    if (!corsOrigin) {
      // if corsOrigin ws not set dynamically, get it from the appUrl
      corsOrigin = new URL(appUrl).origin;
    }

    // ========================================================================
    // Resource: Pre Token Generation function
    // ========================================================================

    // Purpose: map from a custom attribute mapped from SAML, e.g. {..., "custom:groups":"[a,b,c]", ...}
    //          to cognito:groups claim, e.g. {..., "cognito:groups":["a","b","c"], ...}
    //          it can also optionally add roles and preferred_role claims

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html

    const preTokenGeneration = new lambda.Function(this, "PreTokenGeneration", {
      runtime: nodeRuntime,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../lambda/pretokengeneration/dist/src"),
      environment: {
        GROUPS_ATTRIBUTE_CLAIM_NAME: groupsAttributeClaimName,
      },
    });

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
      lambdaTriggers: {preTokenGeneration: preTokenGeneration}
    });

    // any properties that are not part of the high level construct can be added using this method
    const userPoolCfn = userPool.node.defaultChild as CfnUserPool;
    userPoolCfn.userPoolAddOns = { advancedSecurityMode: "ENFORCED" }
    userPoolCfn.schema = [{
      name: groupsAttributeName,
      attributeDataType: "String",
      mutable: true,
      required: false,
      stringAttributeConstraints: {
        maxLength: "2000"
      }
    }];

    // create two groups, one for admins one for users
    // these groups can be used without configuring a 3rd party IdP

    new cognito.CfnUserPoolGroup(this, "AdminsGroup", {
      groupName: adminsGroupName,
      userPoolId: userPool.userPoolId,

    });

    new cognito.CfnUserPoolGroup(this, "UsersGroup", {
      groupName: usersGroupName,
      userPoolId: userPool.userPoolId,
    });

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
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      partitionKey: {name: "id", type: dynamodb.AttributeType.STRING}
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
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
      code: lambda.Code.fromAsset("../lambda/api/dist/src"),
      timeout: Duration.seconds(30),
      memorySize: lambdaMemory,
      environment: {
        ITEMS_TABLE_NAME: itemsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
        ALLOWED_ORIGIN: corsOrigin,
        ADMINS_GROUP_NAME: adminsGroupName,
        USERS_GROUP_NAME: usersGroupName,
        USER_POOL_ID: userPool.userPoolId,
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
        actions: [
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:AdminGetUser"
        ]
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

    // uncomment to use an access token instead of an id token

    // const cfnMethod = method.node.defaultChild as apigateway.CfnMethod;
    // cfnMethod.authorizationScopes = ["openid"];

    // ------------------------------------------------------------------------
    // Add CORS support to all
    // ------------------------------------------------------------------------

    Utils.addCorsOptions(proxyResource, corsOrigin);
    Utils.addCorsOptions(rootResource, corsOrigin);

    // ========================================================================
    // Resource: Identity Provider Settings
    // ========================================================================

    // Purpose: define the external Identity Provider details, field mappings etc.

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp.html

    // mapping from IdP fields to Cognito attributes
    const supportedIdentityProviders = ["COGNITO"];
    let cognitoIdp: CfnUserPoolIdentityProvider | undefined = undefined;

    if (identityProviderMetadataURLOrFile && identityProviderName) {

        cognitoIdp = new cognito.CfnUserPoolIdentityProvider(this, "CognitoIdP", {
          providerName: identityProviderName,
          providerDetails: Utils.isURL(identityProviderMetadataURLOrFile) ? {
            MetadataURL: identityProviderMetadataURLOrFile
          } : {
            MetadataFile: identityProviderMetadataURLOrFile
          },
          providerType: identityProviderType,
          // Structure: { "<cognito attribute name>": "<IdP SAML attribute name>" }
          attributeMapping: {
            "email": "email",
            "family_name": "lastName",
            "given_name": "firstName",
            "name": "firstName", // alias to given_name
            [groupsAttributeClaimName]: "groups" //syntax for a dynamic key
          },
          userPoolId: userPool.userPoolId
        });

        supportedIdentityProviders.push(identityProviderName);
      }
    
    if (identityProviderType != "") {
      cognitoIdp = new cognito.CfnUserPoolIdentityProvider(this, "CognitoIdP", {
        providerName: identityProviderName,
        providerDetails: {
          client_id: oidcClientId,
          attributes_request_method: oidcMethod,
          oidc_issuer: oidcUserUrl,
          client_secret: oidcClientSecret,
          authorize_scopes: "email profile openid"
        },
        providerType: identityProviderType,
        // Structure: { "<cognito attribute name>": "<IdP SAML attribute name>" }
        attributeMapping: {
          "email": "email",
          "family_name": "lastName",
          "given_name": "firstName",
          "name": "firstName", // alias to given_name
          [groupsAttributeClaimName]: "groups" //syntax for a dynamic key
        },
        userPoolId: userPool.userPoolId
      });

      supportedIdentityProviders.push(identityProviderName);
    }


    // ========================================================================
    // Resource: Cognito App Client
    // ========================================================================

    // Purpose: each app needs an app client defined, where app specific details are set, such as redirect URIs

    // See also:
    // - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html

    const cfnUserPoolClient = new cognito.CfnUserPoolClient(this, "CognitoAppClient", {
      supportedIdentityProviders: supportedIdentityProviders,
      clientName: "Web",
      allowedOAuthFlowsUserPoolClient: true,
      allowedOAuthFlows: ["code"],
      allowedOAuthScopes: ["phone", "email", "openid", "profile"],
      explicitAuthFlows: ["ALLOW_REFRESH_TOKEN_AUTH"],
      preventUserExistenceErrors: "ENABLED",
      generateSecret: false,
      refreshTokenValidity: 1,
      callbackUrLs: [appUrl],
      logoutUrLs: [appUrl],
      userPoolId: userPool.userPoolId
    });

    // we want to make sure we do things in the right order
    if (cognitoIdp) {
      cfnUserPoolClient.node.addDependency(cognitoIdp);
    }

    // ========================================================================
    // Resource: Cognito Auth Domain
    // ========================================================================

    // Purpose: creates / updates the custom subdomain for cognito's hosted UI

    // See also:
    // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html

    const cfnUserPoolDomain = new cognito.CfnUserPoolDomain(this, "CognitoDomain", {
      domain: domain,
      userPoolId: userPool.userPoolId
    });


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
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, "AppClientIdOutput", {
      description: "App Client ID",
      value: cfnUserPoolClient.ref
    });

    new cdk.CfnOutput(this, "RegionOutput", {
      description: "Region",
      value: this.region
    });

    new cdk.CfnOutput(this, "CognitoDomainOutput", {
      description: "Cognito Domain",
      value: cfnUserPoolDomain.domain
    });

    new cdk.CfnOutput(this, "LambdaFunctionName", {
      description: "Lambda Function Name",
      value: apiFunction.functionName
    });

    new cdk.CfnOutput(this, "AppUrl", {
      description: "The frontend app's URL",
      value: appUrl
    });

    if (uiBucketName) {
      new cdk.CfnOutput(this, "UIBucketName", {
        description: "The frontend app's bucket name",
        value: uiBucketName
      });
    }
  }

  private createCloudFrontDistribution(uiBucket: Bucket): CloudFrontWebDistribution {
    const cloudFrontOia = new cloudfront.OriginAccessIdentity(this, 'OIA', {
      comment: `OIA for ${uiBucket.bucketName}`
    });

    // create CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'UIDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: uiBucket,
            originAccessIdentity: cloudFrontOia
          },
          behaviors: [{isDefaultBehavior: true}]
        }
      ]
    });

    return distribution;
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

const stackProps = {env: {region: stackRegion, account: stackAccount}};
const backendStack = new BackendStack(app, stackName, stackProps);

backendStack.templateOptions.transforms = ["AWS::Serverless-2016-10-31"];
