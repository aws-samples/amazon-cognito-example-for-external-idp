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

import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {StorageService} from "./services/storageService";
import pathToRegexp from "path-to-regexp";
import {Pet} from "./model/pet";
import uuid4 from "uuid/v4";

/**
 * Demo REST service handler
 */
export class CognitoLDAPDemoHandler {

  private getAPetPath = pathToRegexp("/pets/:pet");

  /**
   * @param storageService persistent storage service (e.g. DynamoDB)
   */
  constructor(private storageService: StorageService) {
  }

  /**
   * Main entry point for the lambda function
   * @param event
   * @param context
   */
  public async handle(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {

    // ensure we have a lower case variant for each header name
    this.lowerCaseHeaderNames(event.headers);
    this.lowerCaseHeaderNames(event.multiValueHeaders);

    console.log(event);

    // dispatch handlers based on path
    const method = event.httpMethod.toLowerCase();
    const path = event.path;

    if (path === "/test" && method === "get") {
      return this.handleTestPath({});
    } else if (path === "/pets" && method === "get") {

      return this.getAllPets();

    } else if (path === "/pets" && method === "post") {

      if (event.body) {
        const pet = JSON.parse(event.body) as Pet;
        if (!pet.id) {
          pet.id = uuid4();
        }
        await this.savePet(pet);
        return this.generateResponse(pet, 200);
      } else {
        return this.generateResponse({error: "missing body"}, 400);
      }

    } else if (method === "get") {

      const match = this.getAPetPath.exec(path);
      if (match) {
        const petId = match[1];
        const pet = await this.getPet(petId);
        if (pet) {
          return this.generateResponse(pet, 200);
        } else {
          return this.generateResponse({error: "pet not found"}, 404);
        }
      }
    }
    return this.generateResponse({error: "unsupported_operation"}, 404);
  }

  // noinspection JSMethodCanBeStatic
  /**
   * for each header name, normalize it to lower case
   * @param headers
   */
  private lowerCaseHeaderNames(headers: { [key: string]: any }) {
    if (headers) {
      for (const headerName of Object.keys(headers)) {
        const lowerCaseHeaderName = headerName.toLowerCase();
        if (lowerCaseHeaderName !== headerName) {
          headers[lowerCaseHeaderName] = headers[headerName];
          delete headers[headerName];
        }
      }
    }
  }

  /**
   * Responds with a simple status:ok response
   * @param headers default CORS headers etc
   */
  private handleTestPath(headers: Headers) {
    return this.generateResponse({status: "ok"}, 200, headers);
  }

  /**
   * Generate an APIGatewayProxyResult based on the body, statusCode and headers provided
   * @param payload the response's body, either as string or as object (will be auto stringified)
   * @param statusCode the http status code to return
   * @param headers response headers, both regular and multiValue headers, header names must be in lowercase
   */
  // noinspection JSMethodCanBeStatic
  private generateResponse(payload: string | object,
                           statusCode: number = 200,
                           headers: { [header: string]: HeaderValue | HeaderValue[] } = {}): APIGatewayProxyResult {

    const body = (typeof payload === "object") ? JSON.stringify(payload) : payload;

    this.lowerCaseHeaderNames(headers);

    const singleValueHeaders: Headers = {};
    const multiValueHeaders: MultiValueHeaders = {};

    // handle single and multiValue headers
    if (headers) {
      const headerNames: string[] = Object.keys(headers);
      for (const headerName of headerNames) {
        const header = headers[headerName];
        if (header instanceof Array) {
          if (header.length === 1) {
            singleValueHeaders[headerName] = header[0];
          } else {
            multiValueHeaders[headerName] = header;
          }
        } else {
          singleValueHeaders[headerName] = header;
        }
      }
    }

    const response = {
      body,
      statusCode,
      headers: singleValueHeaders,
      multiValueHeaders,
    };

    console.log(response);
    return response;
  }

  /**
   * Parse an id token
   * @param idToken
   */
// noinspection JSUnusedLocalSymbols
  private parseToken(idToken: string): { sub: string } {
    const tokenParts = idToken.split(".");
    const claimsPart = tokenParts[1];
    const base64Decoded = this.base64Decode(claimsPart);
    return JSON.parse(base64Decoded);
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Base 64 decode a string
   * @param str
   */
  private base64Decode(str: string) {
    return Buffer.from(str, "base64").toString();
  }

  /**
   * generate a response that returns all pets
   */
  private async getAllPets(): Promise<APIGatewayProxyResult> {
    const allPets = await this.storageService.getAllPets();
    return this.generateResponse(allPets, 200);
  }

  private async savePet(pet: Pet) {
    return this.storageService.savePet(pet);
  }

  private async getPet(petId: string) {
    return await this.storageService.getPet(petId);
  }
}

// custom types

type HeaderValue = boolean | number | string;

interface Headers {
  [header: string]: HeaderValue;
}

interface MultiValueHeaders {
  [header: string]: HeaderValue[];
}
