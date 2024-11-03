import { AuthTokens } from 'aws-amplify/auth';

export class User {
  private readonly _attributes?: { [id: string]: any };

  constructor(session: AuthTokens) {
    this._attributes = session.idToken.payload;
    console.log(this._attributes)
  }

  get groups(): string[] {
    return this.attributes['cognito:groups'] || [];
  }

  get attributes(): { [id: string]: any } {
    return this._attributes || {};
  }

  get name(): string {
    return this.attributes['name'];
  }

  get email(): string {
    return this.attributes['email'];
  }
}
