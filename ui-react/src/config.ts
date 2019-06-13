import {AuthOptions, AwsCognitoOAuthOpts} from '@aws-amplify/auth/lib/types';
// auto generated based on CloudFormation stack output values
import {autoGenConfigParams} from "./autoGenConfig";

// your Cognito Hosted UI configuration

// for demonstration purposes, replace with actual URL
const redirectURI = window.location.protocol + "//" + window.location.host + "/";

const OAUTH_OPTS: AwsCognitoOAuthOpts = {
  domain: autoGenConfigParams.cognitoDomain,

  scope: ['phone', 'email', 'openid'],

  redirectSignIn: redirectURI,

  redirectSignOut: redirectURI,

  responseType: 'code' // or token
};

export const AUTH_OPTS: AuthOptions = {

  // REQUIRED - Amazon Cognito Region
  region: autoGenConfigParams.region,

  // OPTIONAL - Amazon Cognito User Pool ID
  userPoolId: autoGenConfigParams.cognitoUserPoolId,

  // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
  userPoolWebClientId: autoGenConfigParams.cognitoUserPoolAppClientId,

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


export const API_URL = autoGenConfigParams.apiUrl;

//For local testing:
//export const API_URL = "http://localhost:3001";
