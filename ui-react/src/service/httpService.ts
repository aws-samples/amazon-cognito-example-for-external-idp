import {Auth} from "aws-amplify";
import {API_URL} from "../config";

export abstract class HttpService {

  // noinspection JSMethodCanBeStatic
  protected async requestWithAuth(method: string, url: string, body?: any): Promise<Response> {
    // check the current user when the App component is loaded
    const session = await Auth.currentSession();
    const contentType = body && typeof body === "object" ? "application/json" : "text/plain";

    let response: Response;
    try {
      response = await fetch(API_URL + url, {
        body: body ? JSON.stringify(body) : undefined,
        method: method,
        headers: {
          "Authorization": session.getAccessToken().getJwtToken(),
          "Content-Type": contentType
        }
      });
    } catch (e) {
      console.error(e);
      throw e;
    }

    if (!response.ok) {

      // our API returns objects of type {error:string} in case of an error
      let errorObject = await response.json();
      const message = errorObject.error;
      console.error(`statusCode: ${response.status}, errorMessage: ${message}`);

      if(response.status === 401) {
        // 401 means the user is not authenticated,
        // this is for example a result of a forced sign out
        // so we can clear the no longer working token (and require re-sign-in)
        await Auth.signOut();
      }
      throw new Error(message);

    }
    return response;
  }


}
