/*
 * Copyright 2019. Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *          http://aws.amazon.com/apache2.0/
 *
 *  or in the "license" file accompanying this file.
 *  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions
 *  and limitations under the License.
 *
 */

import {Pet} from "../models/pet";

/**
 * Persistent Storage Service
 */
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
