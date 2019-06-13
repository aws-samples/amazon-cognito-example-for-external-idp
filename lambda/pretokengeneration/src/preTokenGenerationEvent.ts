export interface PreTokenGenerationEvent {
  triggerSource?: string;
  userPoolId?: string;
  request: {
    userAttributes: { [key: string]: string },
    groupConfiguration: {
      groupsToOverride: string[],
      iamRolesToOverride: string[],
      preferredRole: string[] | null,
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
    } | null,
  };
}
