import express = require("express");
import aws = require("aws-sdk");
import {Express, json, Request, Response, urlencoded} from "express";
import cors from "cors";
import {eventContext} from "aws-serverless-express/middleware";

import uuid4 from "uuid/v4";
import {Pet} from "./model/pet";
import {amazonCognitoAuthorizer} from "./services/amazonCognitoClaimsMiddleware";
import {DynamoDBStorageService} from "./services/dynamoDBStorageService";
import {DynamoDBTokenRevocationHandler} from "./dynamoDBTokenRevocationHandler";

if (!process.env.ITEMS_TABLE_NAME) {
  throw new Error("Required environment variable ITEMS_TABLE_NAME is missing");
}

if (!process.env.USER_POOL_ID) {
  throw new Error("Required environment variable USER_POOL_ID is missing");
}

if (!process.env.ALLOWED_ORIGIN) {
  throw new Error("Required environment variable ALLOWED_ORIGIN is missing");
}

export const app: Express = express();

const adminsGroupName: string = process.env.ADMINS_GROUP_NAME || "pet-app-admins";
const usersGroupName: string = process.env.USERS_GROUP_NAME || "pet-app-users";
const authorizationHeaderName: string = process.env.AUTHORIZATION_HEADER_NAME || "Authorization";
const allowedOrigin: string = process.env.ALLOWED_ORIGIN;
const userPoolId: string = process.env.USER_POOL_ID;
const revokedTokensTableName: string | undefined = process.env.REVOKED_TOKENS_TABLE_NAME;
const storageService = new DynamoDBStorageService(process.env.ITEMS_TABLE_NAME);
const cognito = new aws.CognitoIdentityServiceProvider();

const tokenRevocationHandler = revokedTokensTableName ?
  new DynamoDBTokenRevocationHandler(revokedTokensTableName, authorizationHeaderName) : undefined;

app.use(cors({
  credentials: false,
  origin: [allowedOrigin],
}));
app.use(json());
app.use(urlencoded({extended: true}));

app.use(eventContext());
app.use(amazonCognitoAuthorizer({
  supportedGroups: [adminsGroupName, usersGroupName],
  revokedTokenValidator: tokenRevocationHandler,
}));

/**
 * Ping
 */
app.get("/", async (req: Request, res: Response) => {
  res.json({status: "ok"});
});

/**
 * List all pets
 */
app.get("/pets", async (req: Request, res: Response) => {

  if (req.groups.has(adminsGroupName)) {
    // if the user has the admin group, we return all pets
    res.json(await storageService.getAllPets());
  } else {
    // otherwise, just owned pets (middleware ensure that the user is in either of the 2 groups)
    res.json(await storageService.getAllPetsByOwner(req.username));
  }
});

/**
 * Get a pet
 */
app.get("/pets/:petId", async (req: Request, res: Response) => {
  const petId = req.params.petId;

  const pet = await storageService.getPet(petId);

  if (!pet) {
    res.status(404).json({error: `Pet with id ${petId} was not found`});
    return;
  }

  if (req.groups.has(adminsGroupName) || pet.owner === req.username) {
    // if the pet is owned by the user or they are an admin, return it.
    res.json(pet);
  } else {
    res.status(403).json({error: `Unauthorized`});
  }
});

/**
 * Create a pet
 */
app.post("/pets", async (req: Request, res: Response) => {

  const pet: Pet = req.body;

  // TODO: make sure body is parsed as JSON, post and put stopped working
  console.log("post /pets ", typeof pet, pet);

  if (pet.id) {
    res.status(400).json({error: "POST /pet auto assigns an id. In order to update use PUT /pet"});
    return;
  }

  // auto generate an ID
  pet.id = uuid4();
  // set the owner to the current user
  pet.owner = req.username;
  await storageService.savePet(pet);
  res.json(pet);
});

/**
 * Update a pet
 */
app.put("/pets/:petId", async (req: Request, res: Response) => {

  const updatedPet: Pet = req.body;
  const petId = req.params.petId;

  if (!petId) {
    res.status(400).json({error: "Invalid request - missing Pet ID"});
    return;
  }
  if (!updatedPet) {
    res.status(400).json({error: "Invalid request - missing Pet"});
    return;
  }
  if (updatedPet.id !== petId) {
    res.status(400).json({error: "Invalid request - Pet.id doesn't match request param"});
    return;
  }
  const existingPet = await storageService.getPet(petId);

  if (!existingPet) {
    res.status(404).json({error: `Pet with id ${petId} was not found`});
    return;
  }

  if (req.groups.has(adminsGroupName) || updatedPet.owner === existingPet.owner && existingPet.owner === req.username) {
    // if the user is an admin, or the pet is owned by the owner and didn't change the owner, allow
    // only admin can change the owner
    await storageService.savePet(updatedPet);
    res.json(updatedPet);

  } else {
    res.status(403).json({error: "Unauthorized"});
  }
});

/**
 * Delete a pet
 */
app.delete("/pets/:petId", async (req: Request, res: Response) => {

  const petId = req.params.petId;
  const pet = await storageService.getPet(petId);

  if (!pet) {
    res.status(404).json({error: `Pet with id ${petId} was not found`});
    return;
  }

  if (req.groups.has(adminsGroupName) || pet.owner === req.username) {
    // if the pet is owned by the user or they are an admin, allow deleting it
    await storageService.deletePet(petId);
    res.json(pet);
  } else {
    res.status(403).json({error: `Unauthorized`});
  }
});

app.post("/globalSignOut", async (req: Request, res: Response) => {
  // this revokes the refresh token, and also the access token for any cognito API calls,
  // however since we don't give the user any aws.cognito.signin.user.admin scope, users can't call that directly
  // so we call the admin version of that API, and use a DDB table to mark the access / id tokens as revoked
  await cognito.adminUserGlobalSignOut({Username: req.username, UserPoolId: userPoolId}).promise();
  if (tokenRevocationHandler) {
    await tokenRevocationHandler.revokeToken(req);
  }
  res.status(200).send();
});
