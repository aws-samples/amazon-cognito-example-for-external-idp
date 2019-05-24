export interface PreTokenGenerationEvent {
  request: {
    userAttributes: { [key: string]: string },
    groupConfiguration: {
      groupsToOverride: string[],
      iamRolesToOverride: string[],
      preferredRole: string[],
    },
  };

  response: {
    claimsOverrideDetails?: {
      claimsToAddOrOverride?: { [key: string]: string },
      claimsToSuppress?: string[],

      groupOverrideDetails?: {
        groupsToOverride?: string[],
        iamRolesToOverride?: string[],
        preferredRole?: string,
      },
    },
  };
}
