import {HttpService} from "./httpService";
import {Auth} from "aws-amplify";

export interface AuthService {
  globalSignOut(): Promise<void>;
}

export class HttpAuthService extends HttpService implements AuthService{
  async globalSignOut(){
    try {
      // revokes the refresh token, (and access token for usage with cognito APIs)
      await this.requestWithAuth("POST", "/globalSignOut");
    } finally {
      // removes tokens from localStorage
      await Auth.signOut();
    }
  }
}
