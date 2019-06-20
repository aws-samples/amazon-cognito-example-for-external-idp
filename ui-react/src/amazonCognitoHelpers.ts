import {CognitoUser} from "@aws-amplify/auth";


export class User{

  private static readonly COGNITO_GROUPS_CLAIM_NAME = "cognito:groups";

  constructor(private cognitoUser: CognitoUser) {

  }



  getGroups(): string[] {
    const claims = this.getClaims();

    if(claims && claims[User.COGNITO_GROUPS_CLAIM_NAME]) {
      return claims[User.COGNITO_GROUPS_CLAIM_NAME];
    }
    return [];
  }

  getClaims(): { [id: string]: any; } {
    if (this.cognitoUser&& this.cognitoUser.getSignInUserSession() && this.cognitoUser.getSignInUserSession().isValid()) {
      return this.cognitoUser.getSignInUserSession().getIdToken().decodePayload();
    }
    return {};
  };


}

