import {CognitoUser} from "@aws-amplify/auth";

export class User {

  constructor(private cognitoUser: CognitoUser) {
  }

  getGroups(): string[] {
    return this.getClaims()["cognito:groups"] || [];
  }

  getClaims(): { [id: string]: any; } {
    return (this.cognitoUser && this.cognitoUser.getSignInUserSession()
      && this.cognitoUser.getSignInUserSession().isValid()
      && this.cognitoUser.getSignInUserSession().getIdToken().decodePayload()) || {};
  };
}

