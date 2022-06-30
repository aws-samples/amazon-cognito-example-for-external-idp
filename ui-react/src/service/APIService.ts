import { Pet } from "../model/pet";
import { REST_API_NAME } from "../config/amplifyConfig";
import { Auth, API } from "aws-amplify";

export interface APIService {
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

  /**
   * forces sign out globally
   */
  forceSignOut(): Promise<void>;
}

/**
 * As the name suggests, handles API calls to the Pet service.
 */
export class HttpAPIService implements APIService {
  constructor(private api: typeof API, private auth: typeof Auth) {}

  /**
   * returns all pets that the user is permitted to see
   */
  public async getAllPets(): Promise<Pet[]> {
    const authorizationHeader = await this.getAuthorizationHeader();
    return await this.api.get(REST_API_NAME, "/pets", {
      headers: authorizationHeader,
    });
  }

  /**
   * saves or updates a pet (if it has an id, it's an update, if not, it's a create)
   * @param pet the pet to save
   */
  public async savePet(pet: Pet) {
    const authorizationHeader = await this.getAuthorizationHeader();
    if (pet.id) {
      await this.api.put(REST_API_NAME, `/pets/${pet.id}`, {
        body: pet,
        headers: authorizationHeader,
      });
    } else {
      await this.api.post(REST_API_NAME, "/pets", {
        body: pet,
        headers: authorizationHeader,
      });
    }
  }

  /**
   * deletes a pet
   * @param pet
   */
  public async deletePet(pet: Pet): Promise<void> {
    const authorizationHeader = await this.getAuthorizationHeader();
    await this.api.del(REST_API_NAME, `/pets/${pet.id}`, {
      headers: authorizationHeader,
    });
  }

  /**
   * forces sign out globally
   */
  public async forceSignOut() {
    const authorizationHeader = await this.getAuthorizationHeader();
    try {
      await this.api.post("main", "/forceSignOut", {
        headers: authorizationHeader,
      });
    } finally {
      // removes tokens from localStorage
      await this.auth.signOut();
    }
  }

  private async getAuthorizationHeader() {
    const session = await this.auth.currentSession();
    // either id token or access token based on the API
    const idToken = session.getIdToken().getJwtToken();
    return { Authorization: idToken };
  }
}
