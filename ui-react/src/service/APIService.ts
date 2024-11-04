import { Pet } from "../model/pet";
import { REST_API_NAME } from "../config/amplifyConfig";
import { post, get, put, del } from "aws-amplify/api";
import { signOut, fetchAuthSession } from "aws-amplify/auth";

export interface APIService {
  /** * returns all pets that the user is permitted to see */ 
  getAllPets(): Promise<
    Pet[]
  >;
  /** * saves or updates a pet (if it has an id, it's an update, if not, it's a create) * @param pet the pet to save */ 
  savePet(
    pet: Pet
  ): Promise<void>;
  /** * deletes a pet, if the user is permitted * @param pet */ 
  deletePet(
    pet: Pet
  ): Promise<void>;
  /** * forces sign out globally */ 
  forceSignOut(): Promise<void>;
}
/** * As the name suggests, handles API calls to the Pet service. */ 
export class HttpAPIService
  implements APIService
{
  /** * returns all pets that the user is permitted to see */ 
  public async getAllPets(): Promise<
    Pet[]
  > {
    const authorizationHeader = await this.getAuthorizationHeader();
    const response = await get({
      apiName: REST_API_NAME,
      path: "pets",
      options: { headers: authorizationHeader },
    });

    const data = await (await response.response).body.json();

    if (!Array.isArray(data)) {
        throw new Error('API response is not an array');
    }

    return data as Pet[];
  }
  /** * saves or updates a pet (if it has an id, it's an update, if not, it's a create) * 
   * @param pet the pet to save */ 
  public async savePet(
    pet: Pet
  ) {
    const authorizationHeader = await this.getAuthorizationHeader();
    if (pet.id) {
      await put({
        apiName: REST_API_NAME,
        path: `pets/${pet.id}`,
        options: { body: pet as Record<string, any>, headers: authorizationHeader },
      });
    } else {
      await post({
        apiName: REST_API_NAME,
        path: "pets",
        options: { body: pet as Record<string, any>, headers: authorizationHeader },
      });
    }
  }
  /** * deletes a pet * @param pet */ 
  public async deletePet(
    pet: Pet
  ): Promise<void> {
    const authorizationHeader = await this.getAuthorizationHeader();
    await del({
      apiName: REST_API_NAME,
      path: `pets/${pet.id}`,
      options: { headers: authorizationHeader },
    });
  }
  /** * forces sign out globally */ 
  public async forceSignOut() {
    const authorizationHeader = await this.getAuthorizationHeader();
    try {
      await post({
        apiName: "main",
        path: "forceSignOut",
        options: { headers: authorizationHeader },
      });
    } finally {
      await signOut();
    }
  }
  private async getAuthorizationHeader() {
    const { tokens } = await fetchAuthSession();
    return { Authorization: tokens?.idToken?.toString() };
  }
}
