import {CognitoUser} from "@aws-amplify/auth";

export const getGroups = (claims: { [id: string]: any; }): string[] => {
  if(claims && claims["cognito:groups"]) {
    return claims["cognito:groups"];
  }
  return [];
};

export const getClaims = (user: CognitoUser): { [id: string]: any; } => {
  if (user && user.getSignInUserSession() && user.getSignInUserSession().isValid()) {
    return user.getSignInUserSession().getIdToken().decodePayload();
  }
  return {};
};

