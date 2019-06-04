import express = require("express");
import {Express, json, Request, Response, urlencoded} from "express";
import cors from "cors";
import {eventContext} from "aws-serverless-express/middleware";

import uuid4 from "uuid/v4";
import {Pet} from "./model/pet";
import {amazonCognitoGroups} from "./services/amazonCognitoGroupsMiddleware";

export const app: Express = express();

app.use(cors({
  credentials: false,
  origin: ["http://localhost:3000"],
}));
app.use(json());
app.use(urlencoded({extended: true}));
app.use(eventContext());
app.use(amazonCognitoGroups());

const pets: Pet[] = [
  {
    "type": "dog",
    "price": 50,
    "id": "e96638b8-0d45-42ac-b567-5b921f3a9e57",
  },
  {
    "type": "cat",
    "price": 70,
    "id": "276c0cfa-39ca-4155-a802-f1af0c5ba5e9",
  },
  {
    "type": "hamster",
    "price": 10,
    "id": "a120afd2-9895-4ff3-a41b-b8364381488c",
  },
];

/**
 * List all pets
 */
app.get("/pets", (req: Request, res: Response) => {

  if (req.groups.has("test")) {
    res.json([...pets, {id: "special", type: "secret", price: 1000}]);
  }
  res.json(pets);
});

/**
 * Get a pet
 */
app.get("/pets/:petId", (req: Request, res: Response) => {
  const petId = req.params.petId;
  const pet = pets.find((p) => p.id === petId);
  if (!pet) {
    res.status(404).send("Pet with id " + petId + " not found");
    return;
  }
  res.json(pet);
});

/**
 * Create a pet
 */
app.post("/pets", (req: Request, res: Response) => {
  const pet: Pet = req.body;
  if (pet.id) {
    res.status(400).send("Create pet auto assigns an ID, to update use PUT");
    return;
  }
  pet.id = uuid4();
  pets.push(pet);
  res.json(pet);
});

/**
 * Update a pet
 */
app.put("/pets/:petId", (req: Request, res: Response) => {
  const updatedPet: Pet = req.body;
  const petId = req.params.petId;
  if (!updatedPet) {
    res.status(400).send("Invalid request - missing Pet");
    return;
  }
  if (updatedPet.id && updatedPet.id !== petId) {
    res.status(400).send("Invalid request - Pet.id doesn't match request param");
    return;
  }
  const existingPet = pets.find((p) => p.id === petId);

  if (!existingPet) {
    res.status(404).send("Pet with id " + petId + " not found");
    return;
  }

  Object.assign(existingPet, updatedPet);

  res.json(existingPet);
});

/**
 * Delete a pet
 */
app.delete("/pets/:petId", (req: Request, res: Response) => {
  const petId = req.params.petId;
  const existingPetIndex = pets.findIndex((p) => p.id === petId);
  if (existingPetIndex === -1) {
    res.status(404).send("Pet with id " + petId + " not found");
    return;
  }
  const deletedItem = pets[existingPetIndex];
  pets.splice(existingPetIndex, 1);
  res.json(deletedItem);
});
