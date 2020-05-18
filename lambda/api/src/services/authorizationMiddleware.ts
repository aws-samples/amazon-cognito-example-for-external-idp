import {NextFunction, Request, RequestHandler, Response} from "express";

/**
 * Common claims for both id and access tokens
 */
export interface ClaimsBase {
  [name: string]: any;

  aud: string;
  iss: string;
  "cognito:groups"?: string[];
  exp: number;
  iat: number;
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

/**
 * combined type for Claims
 */
export type Claims = IdTokenClaims | AccessTokenClaims;

// enrich the Express request type for type completion
declare global {
  namespace Express {
    interface Request {
      claims: Claims;
      groups: Set<string>;
      username: string;
    }
  }
}

/**
 * Returns the groups claim from either the id or access tokens as a Set
 * @param claims
 */
const getGroups = (claims: ClaimsBase): Set<string> => {
  const groups = claims["cognito:groups"];
  if (groups) {
    return new Set<string>(groups);
  }
  return new Set<string>();
};

/**
 * Parses the token and returns the claims
 * @param token a base64 encoded JWT token (id or access)
 * @return parsed Claims or null if no token was provided
 */
const getClaimsFromToken = (token?: string): Claims | null => {
  if (!token) {
    return null;
  }
  try {
    const base64decoded = Buffer.from(token.split(".")[1], "base64").toString("ascii");
    return JSON.parse(base64decoded);
  } catch (e) {
    console.error("Invalid JWT token", e);
    // in case a malformed token was provided, we treat it as if non was provided, users will get a 401 in our case
    return null;
  }
};

/**
 * Handles force sign out event
 * e.g. a user who would like to force sign-out from all other devices
 * (not just invalidate the current user's tokens, but any token issued before this point in time
 * to that user in any device)
 */
export interface ForceSignOutHandler {

  isForcedSignOut(req: Request): Promise<boolean>;

  forceSignOut(req: Request): Promise<void>;
}

/**
 * Params for amazonCognitoAuthorizerMiddleware
 */
export interface Opts {
  /**
   * the header passing the token, e.g. Authorization
   */
  authorizationHeaderName?: string;

  /**
   * optional, any group that allows the user to do something useful in the app
   *      if the user has none of them, we just return 403 Forbidden as they can't do anything
   *      if not provided, will not do this pre-check
   */
  supportedGroups?: string[];

  /**
   * optional, if provided, will be called to check if the current user has logged out globally
   */
  forceSignOutHandler?: ForceSignOutHandler;

  /**
   * optional, if provided, will allow all requests to the provided paths
   */
  allowedPaths?: string[];
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
 */
export const authorizationMiddleware = (opts?: Opts): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {

  if (opts && opts.allowedPaths && opts.allowedPaths.includes(req.path)) {
    next();
    return;
  }

  const authorizationHeaderName = opts && opts.authorizationHeaderName || "Authorization";
  const token = req.header(authorizationHeaderName);

  const claims = getClaimsFromToken(token);

  if (claims) {

    req.claims = claims;
    if (claims["cognito:username"]) {
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

    // check if user did a global sign out (optional)
    if (opts && opts.forceSignOutHandler) {
      const isTokenRevoked = await opts.forceSignOutHandler.isForcedSignOut(req);
      if (isTokenRevoked) {
        res.status(401).json({error: "Your session has expired, please sign in again"});
        return;
      }
    }

    // if we got here, continue with the request

    next();

  } else {
    // the only way to get here (e.g. no claims on the request) is if it's on a path with no required auth
    // or if the token header name is incorrect
    // API Gateway would deny access otherwise
    // but for defense in depth, we return an explicit deny here (e.g. in case of running locally)

    res.status(401).json({error: "Please sign in"});
  }

};
