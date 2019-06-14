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
      claims: Claims;
      groups: Set<string>;
      username: string;
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

/**
 * Creates a middleware that enriches the request object with:
 * - claims: Claims (JWT ID token claims)
 * - groups: Set<string> (Cognito User Pool Groups, from the cognito:groups claim)
 *
 * It will return a 401 if a JWT was not supplied / not valid
 * It will return a 403 if non of the supportedGroups exists in the claim
 *
 * @param supportedGroups any group that allows the user to do something useful in the app
 *      if the user has none of them, we just return 403 Forbidden as they can't do anything
 */
export function amazonCognitoAuthorizer(...supportedGroups: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): any => {
    const claims = getClaims(req);
    if (claims) {
      req.claims = claims;
      req.username = claims["cognito:username"];
      const groups = getGroups(claims);
      if (groups) {
        req.groups = groups;
      }

      // check if the user has at least 1 required group
      // e.g. if the claim has [g1]
      // and basicGroups includes [g1, g2]
      // it means the user has at least one of the groups that allows them to do something

      const userHasAtLeastOneSupportedGroup = supportedGroups.some((g) => groups.has(g));
      if (!userHasAtLeastOneSupportedGroup) {
        res.status(403).json({error: "Unauthorized"});
      } else {
        next();
      }
    } else {
      // should be caught by API Gateway, just a sanity check.
      res.status(401).header("WWW-Authenticate", "Bearer realm=\"Access to API\"").send();
    }
  };
}
