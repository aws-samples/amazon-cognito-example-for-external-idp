import {Pet} from "../model/pet";
import {Auth} from "aws-amplify";
import {API_URL} from "../config";

export interface PetService {
  /**
   * returns all pets that the user is permitted to see
   */
  getAllPets(): Promise<Pet[]>;

  /**
   * saves or updates a pet (if it has an id, it's an update, if not, it's a create)
   * @param pet the pet to save
   */
  savePet(pet: Pet): Promise<void>;

  /**
   * deletes a pet, if the user is permitted
   * @param pet
   */
  deletePet(pet: Pet): Promise<void>;
}

/**
 * As the name suggests, handles API calls to the Pet service.
 * This class will add the needed Cognito authorization headers when needed.
 * For demo purposes, this has a direct dependency to Amplify, for an actual project that can be a dependency as well
 */
export class AuthAwarePetService implements PetService {

  /**
   * returns all pets that the user is permitted to see
   */
  public async getAllPets(): Promise<Pet[]> {
    const response = await this.requestWithAuth("GET", "/pets");
    return await response.json();
  }

  /**
   * saves or updates a pet (if it has an id, it's an update, if not, it's a create)
   * @param pet the pet to save
   */
  public async savePet(pet: Pet) {

    if (pet.id) {
      await this.requestWithAuth("PUT", `/pets/${pet.id}`, pet);
    } else {
      await this.requestWithAuth("POST", "/pets", pet);
    }
  }

  /**
   * deletes a pet
   * @param pet
   */
  public async deletePet(pet: Pet): Promise<void> {
    await this.requestWithAuth("DELETE", `/pets/${pet.id}`);
  }

  // noinspection JSMethodCanBeStatic
  private async requestWithAuth(method: string, url: string, body?: any): Promise<Response> {
    // check the current user when the App component is loaded
    let session = await Auth.currentSession();
    let response: Response;

    try {
      response = await fetch(API_URL + url, {
        body: body ? JSON.stringify(body) : undefined,
        method: method,
        headers: {
          "Authorization": session.getAccessToken().getJwtToken(),
          "Content-Type": "application/json"
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
      throw new Error(message);
    }
    return response;
  }


}


