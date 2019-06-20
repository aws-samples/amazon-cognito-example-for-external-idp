import {Pet} from "../model/pet";
import {HttpService} from "./httpService";


export interface PetService  {
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
export class HttpPetService extends HttpService implements PetService {

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

}


