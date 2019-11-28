import {getGroupsCustomAttributeName, parseGroupsAttribute, PreTokenGenerationEvent} from "./helpers";

// noinspection JSUnusedGlobalSymbols
/**
 * Converts a SAML mapped attribute, e.g. list of groups, to a cognito groups claim in the generated token
 * (groups claims are included in both id tokens and access tokens, where custom attributes only show in the id token)
 *
 * E.g. from a string attribute named "custom:groups" to an array attribute named "cognito:groups":
 * <pre>
 * {
 *  ...
 *  "custom:groups": "[g1,g2]",
 *  ...
 * }
 * </pre>
 * to
 *
 * <pre>
 * {
 *  ...
 *  "cognito:groups": ["g1","g2"],
 *  ...
 * }
 * </pre>
 *
 * To be used with the Pre Token Generation hook in Cognito.
 *
 * <b>IMPORTANT</b>: the scope `aws.cognito.signin.user.admin` should NOT be enabled for any app client that uses this
 * The reason is that with aws.cognito.signin.user.admin, users can modify their own attributes with their access token
 *
 * if you want to remove the temporary custom:groups attribute used as an intermediary from the token
 *
 * <code>
 * event.response.claimsOverrideDetails.claimsToSuppress = [getGroupsCustomAttributeName()];
 * </code>
 *
 * @param event Lambda event as described above,
 * see here for details:
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
 *
 * @returns {Promise<*>} Lambda event as described above
 */
export const handler = async (event: PreTokenGenerationEvent): Promise<PreTokenGenerationEvent> => {

  event.response.claimsOverrideDetails = {
    groupOverrideDetails: {
      groupsToOverride:
        [
          // any existing groups the user may belong to
          ...event.request.groupConfiguration.groupsToOverride,
          // groups from the IdP (parses a single value, e.g. "[g1,g2]" into a string array, e.g ["g1","g2"])
          ...parseGroupsAttribute(event.request.userAttributes[getGroupsCustomAttributeName()])
        ]
    }
  };
  return event;
};
