import {NextFunction, Request, RequestHandler, Response} from "express";
import {APIGatewayEventRequestContext, APIGatewayProxyEvent, AuthResponseContext, Context} from "aws-lambda";

export interface Claims {
  [name: string]: string;

  aud: string;
  iss: string;
  "cognito:groups": string;
  "cognito:username": string;
  email: string;
  email_verified: string;
  auth_time: string;
  exp: string;
  iat: string;
  sub: string;
  token_use: "id" | "access";
}

declare global {
  namespace Express {
    interface Request {
      claims?: Claims;
      groups: Set<string>;
      apiGateway?: {
        event: APIGatewayProxyEvent & {
          requestContext: APIGatewayEventRequestContext & {
            authorizer?: AuthResponseContext & {
              claims: Claims,
            } | null;
          },
        };
        context: Context
      };
    }
  }
}

const getClaims = (req: Request): Claims | null => {

  if (req.apiGateway && req.apiGateway.event.requestContext.authorizer) {
    return req.apiGateway.event.requestContext.authorizer.claims;
  }
  return null;
};

const getGroups = (claims: Claims): Set<string> => {
  const groups = claims["cognito:groups"];
  if (groups) {
    return new Set<string>(groups.split(/\s*,\s*/));
  }
  return new Set<string>();
};

export function amazonCognitoGroups(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): any => {
    const claims = getClaims(req);
    if (claims) {
      req.claims = claims;
      const groups = getGroups(claims);
      if (groups) {
        req.groups = groups;
      }
    }
    next();
  };
}
