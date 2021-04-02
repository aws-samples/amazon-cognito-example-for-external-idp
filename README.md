# Identity and Access Control for Custom Enterprise Applications

## Overview

This example can be used as a starting point for using Amazon Cognito together with an external IdP 
(e.g. a SAML 2.0/OIDC provider or a social login provider). 
It shows how to use triggers in order to map IdP attributes 
(e.g. LDAP group membership passed on the SAML response as an attribute) 
to Amazon Cognito User Pools Groups and optionally also to IAM roles. 


It contains all that is needed in order to create a serverless web application with 
Amazon Cognito, Amazon API Gateway, AWS Lambda and Amazon DynamoDB (with optionally an external IdP).

It handles fine-grained role-based access control and demonstrates how to associate users to roles/groups based 
on mapped attributes from an external IdP or social login provider. 

It is using TypeScript for frontend, backend and infrastructure. (Using [AWS CDK](https://github.com/awslabs/aws-cdk))
 
## Modules

The example contains the following modules within these sub-folders: 

### /cdk 

This module is using [AWS CDK](https://docs.aws.amazon.com/cdk/api/latest/) (in developer preview)

CDK is a software development framework for defining cloud infrastructure in code and provisioning it through AWS CloudFormation.

It defines all the resources needed in order to create the sample application

It defines the following resources 

- **Amazon API Gateway**: Amazon API Gateway is a fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale. 
  Combined with [Amazon Cognito User Pools Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html) - it handles validation of the user's tokens.
- **AWS Lambda**: AWS Lambda lets you run code without provisioning or managing servers. You pay only for the compute time you consume - there is no charge when your code is not running. 
  This is the serverless compute service that runs the backend of our app (behind Amazon API Gateway). 
  requests are only forwarded if the user is authenticated and has a valid JWT token.
- **Amazon Cognito User Pools**: Amazon Cognito lets you add user sign-up, sign-in, and access control to your web and mobile apps quickly and easily. 
  Amazon Cognito scales to millions of users and supports sign-in with social identity providers, such as Facebook, Google, and Amazon, and enterprise identity providers via SAML 2.0.
- **Amazon DynamoDB**: Amazon DynamoDB is a serverless key-value and document database that delivers single-digit millisecond performance at any scale.
  It is used as the persistence storage layer for our example application. 
   
### /lambda/api

The backend of the example. This is a standard AWS Lambda application written as a node.js (express.js) application

In order to allow express.js to run in an AWS Lambda runtime, we include https://github.com/awslabs/aws-serverless-express

(see more examples [here](https://github.com/awslabs/aws-serverless-express/tree/master/examples/basic-starter)) 

**Some notable files** 

- **index.ts**: this is a regular [lambda handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html) 
  that uses aws-serverless-express to map between a [AWS Lambda Proxy Integration 
  request/response structure](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
  and the express.js app
  
- **app.ts**: this is the actual express.js app

- **local.ts**: this can be used to launch the app locally as a regular express.js app.

- **services/authorizationMiddleware.ts**: this is an example express.js middleware that does the following: 
  1. Adds type information to the request for simple auto-completion of available request information passed from Amazon API Gateway to the lambda function 
  
  2. A convenient / syntactic sugar that makes the claims and Amazon Cognito User Pool group available on the request object. 
    e.g. `req.groups.has("admin-role")` will return true if the user is authenticated and is a member of group "admin-role"
    and `const email = req.claims ? req.claims.email : null;` will get the user's email if the user is logged in and has an email claim in the JWT

### /lambda/pretokengeneration

This is an [Amazon Cognito User Pools Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html) 
that allows to add/remove claims from the [JWT ID token](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html#amazon-cognito-user-pools-using-the-id-token) before giving it to the user.

It is using a trigger named [Pre Token Generation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html).
It allows to do the following: 

1. Add or remove claims (claims are user built in or custom attributes, e.g. `email` or `custom:customAttributeName`)
2. Create or remove Groups (a special claim under the name `cognito:groups`)
3. Add `roles` and `preferred_role` [mapping](https://docs.aws.amazon.com/cognitoidentity/latest/APIReference/API_RoleMapping.html).
   These mappings are [similar to assigning a role to a group in the AWS console](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html#assigning-iam-roles-to-groups).
   This can be used to later give users fine grained, temporary AWS credentials based on their group.    
   (e.g. letting mobile app users upload a file directly to s3 to their user's folder)
    
In this example we simply map from a custom attribute (that is mapped from an IdP attribute, e.g. a SAML attribute that represents for example the user's group memberships in the corporate directory) 
into a group claim in the token. Group claims are visible in both the id token and the access token generated by Amazon Cognito.


### /ui-react 

A simple React frontend that connects to the backend API.

It is using [AWS Amplify](https://aws-amplify.github.io/), that provides, among others [react components](https://aws-amplify.github.io/docs/js/start?platform=react) for simpler 
integration with various AWS services from web and mobile applications.

AWS Amplify can manage all aspects of a project, but since we used AWS CDK, we followed the [manual setup](https://aws-amplify.github.io/docs/js/authentication#manual-setup)

**Some notable files** 

- **user.ts**: provide an example of how to get the token information (e.g. group membership) on the client side.
  group membership information can be used for example for hiding/graying out sections that the user has no permission for. 
  This is not used for enforcing authorization or validation of the token, but it provides a nicer user experience where actions that the user will not be permitted to perform are not visible / grayed out for them.
  
### /ui-angular

A simple Angular frontend, similar to the React example 

## Notes 

- Do not add the `aws.cognito.signin.user.admin` scope, (not added by default)
    this will allow users to modify their own attributes directly with the access token. 
    Since the IdP is the source of truth, and we don't want users to change attributes 
    (especially those used for authorization) on their own, this scope should not be added. 

- Do not enable any non-OAuth 2.0 auth flows other than `ALLOW_REFRESH_TOKEN_AUTH` (`explicitAuthFlows` in cdk.ts) to ensure users can only use the OAuth 2.0 flows.

 
# Getting Started - Mac / Linux 

## Pre-requisites

1. An AWS account https://aws.amazon.com/resources/create-account/ 
2. AWS CLI https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html 
3. Configure AWS CLI https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html 
4. Ensure you have the latest node and npm installed https://nodejs.org/en/download/

## Installation

1. Clone or fork this repo (e.g. `git clone git@github.com:aws-samples/amazon-cognito-example-for-external-idp.git`)
2. Copy `env.sh.template` to `env.sh` (not recommended to be pushed to your git repo, it's in .gitignore as a protection)
3. Edit `env.sh` and set the values there based on your environment
4. Run `./install.sh` which does the following:
   - Installs all node dependencies (it runs `npm install` in all relevant sub-folders)
   - Builds the project (runs `tsc -b` in each relevant sub-folder - tsc is the TypeScript compiler)
   - Runs `cdk bootstrap` - which creates a stack named CDKToolkit (if it was not created already) that helps simplify managing assets.
     For more information about assets see [here](https://docs.aws.amazon.com/cdk/latest/guide/assets.html)  


NOTES: 

- If you are using a profile, either run `export AWS_PROFILE=<profilename>` before the above commands, or `AWS_PROFILE=<profilename> ./<command>.sh` 
- CDK is installed locally to ensure the right version is used. In order to install it globally for use in other projects, run: `$ npm i -g aws-cdk` (see [here](https://github.com/awslabs/aws-cdk#getting-started) for more details)
 
## Deploying / Updating the Backend Stack

- After installing. Run `./deploy.sh` to deploy the backend stack. (For the first time as well as after making changes)

## Launching the UI

### React 

- `cd ui-react && npm start` to run the UI in http://localhost:3000  

### Angular 

- `cd ui-angular && npm start` to run the UI in http://localhost:3000 (using the same port for simplicity)

## Other Commands  
 
- Run `./diff.sh`   to compare deployed stack with current state
- Run `./synth.sh`  to display the generated CloudFormation script from the CDK code

- Run `./test.sh`   to run all tests
- Run `./build.sh`  to compile all packages 
- Run `./clean.sh`  to clean compiled packages
  
 
# Getting Started - Windows 

Windows command-line files will be coming soon, in the meantime you can use either of these solutions in order to run sh files 
 
- Git BASH: https://gitforwindows.org/
- Windows Subsystem for Linux: https://docs.microsoft.com/en-us/windows/wsl/install-win10
- MinGW: http://www.mingw.org/
- Cygwin: https://www.cygwin.com/
 
## IdP Configuration Instructions 

- **Okta**: 
  - https://aws.amazon.com/premiumsupport/knowledge-center/cognito-okta-saml-identity-provider/
    NOTE: to avoid a circular "chicken and egg" dependency, create the Okta Application with placeholder values just to get the metadata XML, then after deploying, update in Okta for the correct values for the user pool.

- **ADFS**: 
  - https://aws.amazon.com/blogs/mobile/building-adfs-federation-for-your-web-app-using-amazon-cognito-user-pools/
  - https://aws.amazon.com/premiumsupport/knowledge-center/cognito-ad-fs-saml/

## Related Resources 

- AWS Security Blog Post: [Role-based access control using Amazon Cognito and an external identity provider](https://aws.amazon.com/blogs/security/role-based-access-control-using-amazon-cognito-and-an-external-identity-provider/) 

- AWS re:Inforce 2019: Identity and Access Control for Custom Enterprise Applications (SDD412) [Video](https://www.youtube.com/watch?v=VZzx15IEj7Y) | [Slides](https://www.slideshare.net/AmazonWebServices/identity-and-access-control-for-custom-enterprise-applications-sdd412-aws-reinforce-2019)

## License Summary

This sample code is made available under the [MIT-0 license](https://github.com/aws/mit-0). See the LICENSE file.
