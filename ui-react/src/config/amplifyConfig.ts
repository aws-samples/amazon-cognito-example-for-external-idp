// auto generated based on CloudFormation stack output values
import autoGenConfig from './autoGenConfig';
// for demonstration purposes, replace with actual URL

export const REST_API_NAME = "main";

export default {
  Auth: {
    Cognito: {
    // REQUIRED - Amazon Cognito Region
      region: autoGenConfig.region,
    // OPTIONAL - Amazon Cognito User Pool ID
      userPoolId: autoGenConfig.cognitoUserPoolId,

    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
      userPoolClientId: autoGenConfig.cognitoUserPoolAppClientId,

    // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
    // mandatorySignIn: false,
    loginWith: {
      oauth: {

        domain: autoGenConfig.cognitoDomain,

        scopes: ['phone', 'email', 'openid', 'profile'],

        redirectSignIn: [autoGenConfig.appUrl],

        redirectSignOut: [autoGenConfig.appUrl],

        responseType: 'code' as const, // or token

        // optional, for Cognito hosted ui specified options
        options: {
          // Indicates if the data collection is enabled to support Cognito advanced security features. By default, this flag is set to true.
          AdvancedSecurityDataCollectionFlag: true
        }
      }
    }
  }

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

  },

  API: {
    REST: {
      [REST_API_NAME]: {
        name: REST_API_NAME,
        endpoint: autoGenConfig.apiUrl // for local test change to something such as 'http://localhost:3001'
      }
    }
  }
}
