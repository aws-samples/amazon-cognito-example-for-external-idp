/**
 * get the name of the custom user pool attribute holding the mapped groups
 */
export const getGroupsCustomAttributeName = () => process.env.GROUPS_ATTRIBUTE_CLAIM_NAME || "custom:groups";

/**
 * converts a string in the form of "[group1,group2,group3]"
 *  into an array ["group1","group2","group3"]
 *
 * or a single value "group1" to an array ["group1"]
 *
 * @param groupsFromIdP
 */
export const parseGroupsAttribute = (groupsFromIdP: string): string[] => {
  if (groupsFromIdP) {
    if (groupsFromIdP.startsWith("[") && groupsFromIdP.endsWith("]")) {
      // this is how it is received from SAML mapping if we have more than one group
      // remove [ and ] chars. (we would use JSON.parse but the items in the list are not quoted)
      return groupsFromIdP
        .substring(1, groupsFromIdP.length - 1) // unwrap the [ and ]
        .split(/\s*,\s*/) // split and handle whitespace
        .filter(group => group.length > 0); // handle the case of "[]" input

    } else {
      // this is just one group, no [ or ] added
      return [groupsFromIdP];
    }
  }
  return [];
};

/**
 * Type information for the lambda event for the PreTokenGeneration trigger
 */
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
