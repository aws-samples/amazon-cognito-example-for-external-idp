import {NextFunction, Request, RequestHandler, Response} from "express";
import {APIGatewayEventRequestContext, APIGatewayProxyEvent, AuthResponseContext, Context} from "aws-lambda";

/**
 * Common claims for both id and access tokens
 */
export interface ClaimsBase {
  [name: string]: string | undefined;

  aud: string;
  iss: string;
  "cognito:groups"?: string;
  exp: string;
  iat: string;
  sub: string;
  token_use: "id" | "access";
}

/**
 * Some id token specific claims
 */
export interface IdTokenClaims extends ClaimsBase {

  "cognito:username": string;
  email?: string;
  email_verified?: string;
  auth_time: string;
  token_use: "id";
}

/**
 * Some access token specific claims
 */
export interface AccessTokenClaims extends ClaimsBase {

  username?: string;
  token_use: "access";
}

type Claims = IdTokenClaims | AccessTokenClaims;

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

/**
 * Returns the claims information from the Lambda Proxy Request structure
 * @param req
 */
const getClaims = (req: Request): Claims | null => {
  if (req.apiGateway && req.apiGateway.event.requestContext.authorizer) {
    return req.apiGateway.event.requestContext.authorizer.claims;
  }
  return null;
};

/**
 * Returns the groups claim from either the id or access tokens as a Set
 * @param claims
 */
const getGroups = (claims: ClaimsBase): Set<string> => {
  const groups = claims["cognito:groups"];
  if (groups) {
    return new Set<string>(groups.split(/\s*,\s*/));
  }
  return new Set<string>();
};

export interface TokenRevocationHandler {

  isTokenRevoked(req: Request): Promise<boolean>;

  revokeToken(req: Request): Promise<void>;
}

/**
 * Creates a middleware that enriches the request object with:
 * - claims: Claims (JWT ID token claims)
 * - groups: Set<string> (Cognito User Pool Groups, from the cognito:groups claim)
 *
 * It will return a 403 if non of the supportedGroups exists in the claim
 *
 * @param opts
 *
 *    - supportedGroups - optional, any group that allows the user to do something useful in the app
 *      if the user has none of them, we just return 403 Forbidden as they can't do anything
 *      if not provided, will not do this pre-check
 *    - usernameClaimName - optional, which claim to use as username.
 *       If not provided will use either `username`, `cognito:username` or `sub`, whichever is available
 *
 */
export function amazonCognitoAuthorizer(opts?: {
  supportedGroups?: string[],
  usernameClaimName?: string,
  revokedTokenValidator?: TokenRevocationHandler,

}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {

    const claims = getClaims(req);

    if (claims) {

      req.claims = claims;
      if (opts && opts.usernameClaimName) {
        // if we were provided with the claim name to use as username
        const usernameClaim = claims[opts.usernameClaimName];
        if (usernameClaim) {
          req.username = usernameClaim;
        } else {
          console.warn(`Username claim ${opts.usernameClaimName} was not found in token`);
        }
      } else if (claims["cognito:username"]) {
        // username claim name in the id token
        req.username = claims["cognito:username"];
      } else if (claims.username) {
        // username claim name in the access token
        req.username = claims.username;
      } else {
        console.warn(`No username claim found in token, using sub as username`);
        req.username = claims.sub;
      }

      // always returns a Set, if no groups, it will be empty.
      const groups = getGroups(claims);
      req.groups = groups;

      // check if the user has at least 1 required group
      // e.g. if the claim has [g1]
      // and basicGroups includes [g1, g2]
      // it means the user has at least one of the groups that allows them to do something

      if (opts && opts.supportedGroups) {
        const userHasAtLeastOneSupportedGroup = opts.supportedGroups.some((g) => groups.has(g));
        if (!userHasAtLeastOneSupportedGroup) {

          res.status(403).json({error: "Unauthorized"});
          return;
        }
      }
      if (opts && opts.revokedTokenValidator) {
        const isTokenRevoked = await opts.revokedTokenValidator.isTokenRevoked(req);
        if (isTokenRevoked) {
          res.status(401).json({error: "Token is revoked"});
          return;
        }
      }
    }
    next();
  };
}
