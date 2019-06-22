import { createServer, proxy } from "aws-serverless-express";
import { Context } from "aws-lambda";
import { expressApp } from "./expressApp";

const server = createServer(expressApp);

// noinspection JSUnusedGlobalSymbols
export const handler = (event: any, context: Context) => proxy(server, event, context);
