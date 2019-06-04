import {AuthOptions, AwsCognitoOAuthOpts} from '@aws-amplify/auth/lib/types';

// your Cognito Hosted UI configuration
const OAUTH_OPTS: AwsCognitoOAuthOpts = {
  domain: "reinforce2019.auth.us-west-2.amazoncognito.com",

  scope: ['phone', 'email', 'openid'],

  redirectSignIn: 'http://localhost:3000/',

  redirectSignOut: 'http://localhost:3000/',

  responseType: 'code' // or token
};

export const AUTH_OPTS: AuthOptions = {

  // // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
  // identityPoolId: 'us-west-2:1f2d0617-6cb4-47b9-b04b-d3ccaf088da5',

  // REQUIRED - Amazon Cognito Region
  region: "us-west-2",

  // OPTIONAL - Amazon Cognito User Pool ID
  userPoolId: "us-west-2_CunThltbS",

  // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
  userPoolWebClientId: "1q4r4j7tmmvd6n4o2s8ahg6iir",

  // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
  mandatorySignIn: false,

  oauth: OAUTH_OPTS

  /*// OPTIONAL - Configuration for cookie storage
  // Note: if the secure flag is set to true, then the cookie transmission requires a secure protocol
  cookieStorage: {
    // REQUIRED - Cookie domain (only required if cookieStorage is provided)
    domain: '.yourdomain.com',
    // OPTIONAL - Cookie path
    path: '/',
    // OPTIONAL - Cookie expiration in days
    expires: 365,
    // OPTIONAL - Cookie secure flag
    // Either true or false, indicating if the cookie transmission requires a secure protocol (https).
    secure: true
  },

  // OPTIONAL - customized storage object
  storage: new MyStorage(),

  // OPTIONAL - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
  authenticationFlowType: 'USER_PASSWORD_AUTH'*/
};

export const API_URL = "https://svtd9m4652.execute-api.us-west-2.amazonaws.com/prod";
//export const API_URL = "http://localhost:3001";
