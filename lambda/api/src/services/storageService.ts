/**
 * Persistent Storage Service
 */
import {Pet} from "../models/pet";

export interface StorageService {

  /**
   * Returns a pet. Throws an error if not found.
   * @param key
   */
  getPet(key: string): Promise<Pet | null>;

  /**
   * Saves (creates or overwrites) a pet. id is required.
   *
   * @param pet
   */
  savePet(pet: Pet): Promise<void>;

  /**
   * Returns all pets in the database
   */
  getAllPets(): Promise<Pet[]>;

  /**
   * Returns all pets in the database
   */
  getAllPetsByOwner(owner: string): Promise<Pet[]>;

  /**
   * Deletes a pet if that pet exists
   * @param key
   */
  deletePet(key: string): Promise<void>;
}
