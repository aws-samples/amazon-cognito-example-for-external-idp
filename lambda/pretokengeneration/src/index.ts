import {PreTokenGenerationEvent} from "./preTokenGenerationEvent";

// noinspection JSUnusedGlobalSymbols
/**
 * Converts a SAML mapped attribute(s), e.g. list of groups, to a cognito group in the generated Token
 * To be used with the Pre Token Generation hook in Cognito.
 * IMPORTANT: the scope "aws.cognito.signin.user.admin" should NOT be enabled for any app client that uses this
 * The reason is that with aws.cognito.signin.user.admin, users can modify their own attributes with their access token
 *
 * @param event Lambda event as described above,
 * see here for details:
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
 *
 * @returns {Promise<*>} Lambda event as described above
 */
export const handler = async (event: PreTokenGenerationEvent): Promise<PreTokenGenerationEvent> => {

  const GROUPS_ATTRIBUTE_NAME = process.env.GROUPS_ATTRIBUTE_NAME || "custom:groups";

  let ldapGroups = event.request.userAttributes[GROUPS_ATTRIBUTE_NAME];

  // start with the existing Cognito groups
  let ldapGroupsArr = [...event.request.groupConfiguration.groupsToOverride];
  // no claims to suppress yet
  const claimsToSuppress = [];
  if (ldapGroups) {

    if (ldapGroups.startsWith("[") && ldapGroups.endsWith("]")) {
      // this is how it is received from SAML mapping if we have more than one group
      // remove [ and ] chars. (we would use JSON.parse but the items in the list are not with quotes so it will fail)
      ldapGroups = ldapGroups.substring(1, ldapGroups.length - 1);
      if (ldapGroups) {
        ldapGroupsArr.push(...ldapGroups.split(/\s*,\s*/));
      }
    } else {
      // this is just one group, no [ or ] added
      ldapGroupsArr.push(ldapGroups);
    }

    // remove the attribute we used to map the groups into
    claimsToSuppress.push(GROUPS_ATTRIBUTE_NAME);
  }

  // suppress auto generated IdP-based group (optional)

  ldapGroupsArr = ldapGroupsArr.filter(group => !group.startsWith(event.userPoolId!));

  event.response = {
    claimsOverrideDetails: {
      claimsToSuppress,
      groupOverrideDetails: {
        // Will end up as a cognito:groups claim
        groupsToOverride: ldapGroupsArr,
      },
    },
  };

  return event;
};
