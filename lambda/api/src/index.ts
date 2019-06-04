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

import { createServer, proxy } from "aws-serverless-express";
import { Context } from "aws-lambda";
import { app } from "./app";

const binaryMimeTypes: string[] = [
  // "application/javascript",
  // "application/json",
  // "application/octet-stream",
  // "application/xml",
  // "font/eot",
  // "font/opentype",
  // "font/otf",
  // "image/jpeg",
  // "image/png",
  // "image/svg+xml",
  // "text/comma-separated-values",
  // "text/css",
  // "text/html",
  // "text/javascript",
  // "text/plain",
  // "text/text",
  // "text/xml",
];

const server = createServer(app, undefined, binaryMimeTypes);

// noinspection JSUnusedGlobalSymbols
export const handler = (event: any, context: Context) => proxy(server, event, context);
