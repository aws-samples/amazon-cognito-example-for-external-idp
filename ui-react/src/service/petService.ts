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
  async getAllPets(): Promise<Pet[]> {
    try {
      const response = await this.requestWithAuth("GET", "/pets");
      return await response.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * saves or updates a pet (if it has an id, it's an update, if not, it's a create)
   * @param pet the pet to save
   */
  async savePet(pet: Pet) {

    if (!pet) {
      throw new Error("Pet is needed");
    }

    const petId = pet.id;

    let response: Response;

    try {

      if (petId) {
        response = await this.requestWithAuth("PUT", `/pets/${petId}`, pet);
      } else {
        response = await this.requestWithAuth("POST", "/pets", pet);
      }

      if (!response.ok) {
        let errorText = await response.text();
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(response.status + " " + errorText);
      }

    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // noinspection JSMethodCanBeStatic
  private async requestWithAuth(method: string, url: string, body?: any): Promise<Response> {
    // check the current user when the App component is loaded
    let session = await Auth.currentSession();
    return await fetch(API_URL + url, {
      body: body ? JSON.stringify(body) : undefined,
      method: method,
      headers: {
        "Authorization": session.getIdToken().getJwtToken(),
        "Content-Type": "application/json"
      }
    });
  }
}


