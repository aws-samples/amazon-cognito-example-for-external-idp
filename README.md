# Identity and Access Control for Custom Enterprise Applications

## Overview


This example can be used as a starting point for using Amazon Cognito together with an external IdP 
(e.g. a SAML 2.0 based provider or a social login provider). 
It shows how to use triggers in order to map IdP attributes 
(e.g. LDAP group membership passed on the SAML response as an attribute) 
to Amazon Cognito User Pools Groups and optionally also to IAM roles. 


It contains all that is needed in order to create a serverless web application with 
Amazon Cognito, Amazon API Gateway and AWS Lambda (with optionally an external IdP).

It addresses fine grained role based access control and demonstrates how to associate users to roles/groups based 
on mapped attributes from an external IdP or social login provider. 

It is using TypeScript for frontend, backend and even the infrastructure. (Using [AWS CDK](https://github.com/awslabs/aws-cdk))
 
## Modules

The example contains the following modules within these sub-folders: 

### /cdk 

CDK Toolkit CLI Installation: `npm install -g aws-cdk` 

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

- **services/amazonCognitoGroupsMiddleware.ts**: this is an example that both 
  1. Adds type information to the request for simple autocompletion of available request information passed from Amazon API Gateway to the lambda function 
  
  2. A convenient / syntactic sugar that makes the claims and Amazon Cognito User Pool group available on the request object. 
    e.g. `req.groups.has("admin-role")` will return true if the user is authenticated and is a member of group "admin-role"
    and `const email = req.claims ? req.claims.email : null;` will store the email if the user is logged in and has an email claim in the JWT

### /lambda/pretokengeneration

This is an [Amazon Cognito User Pools Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html) 
that allows to add/remove claims from the [JWT ID token](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html#amazon-cognito-user-pools-using-the-id-token) before giving it to the user.

It is using a trigger named [Pre Token Generation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html)
It allows to do the following 

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

- **amazonCognitoHelpers.ts**: provide an example of how to get the token information (e.g. group membership) on the client side.
  this can be used for hiding sections that the user has no permission for in any case. 
  This is not used for enforcing authorization, this is done only in the backend (via [Amazon Cognito User Pools Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)).
  However it provides a nicer user experience where actions that the user will not be permitted to perform are not visible / grayed out for them.
  

 
## License Summary

This sample code is made available under the [MIT-0 license](https://github.com/aws/mit-0). See the LICENSE file.
