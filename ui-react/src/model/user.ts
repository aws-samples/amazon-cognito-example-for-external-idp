import {CognitoUser} from "@aws-amplify/auth";

export class User {

  private readonly _attributes?: { [id: string]: any };

  constructor(private cognitoUser: CognitoUser) {
    // get user claims from the id token
    this._attributes = this.cognitoUser?.getSignInUserSession()?.isValid() ? this.cognitoUser.getSignInUserSession()?.getIdToken()?.decodePayload() : undefined;
  }

  get groups(): string[] {
    return this.attributes["cognito:groups"] || [];
  }

  get attributes(): { [id: string]: any } {
    return this._attributes || {};
  }

  get name(): string {
    return this.attributes["name"];
  }

  get email(): string {
    return this.attributes["email"];
  }

}

