/*
 * Copyright 2019. Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *          http://aws.amazon.com/apache2.0/
 *
 *  or in the "license" file accompanying this file.
 *  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions
 *  and limitations under the License.
 *
 */

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

  const GROUPS_ATTRIBUTE_NAME = process.env.GROUPS_ATTRIBUTE_NAME || "custom:ADGroups";
  let ldapGroups = event.request.userAttributes[GROUPS_ATTRIBUTE_NAME];

  if (!ldapGroups) {
    ldapGroups = "";
  }
  if (ldapGroups.startsWith("[") && ldapGroups.endsWith("]")) {
    // remove [ and ] chars. (we would use JSON.parse but the items in the list are not with quotes so it will fail)
    ldapGroups = ldapGroups.substring(1, ldapGroups.length - 1);
  }
  const ldapGroupsArr = ldapGroups.split(/\s*,\s*/);

  event.response = {
    "claimsOverrideDetails": {
      "claimsToSuppress": [GROUPS_ATTRIBUTE_NAME], // remove the attribute claim from the token
      "groupOverrideDetails": {
        // add the groups mentioned in the attribute to any actual groups the user is part of.
        // Will end up as a cognito:groups claim
        "groupsToOverride": ldapGroupsArr.concat(event.request.groupConfiguration.groupsToOverride),
      },
    },
  };

  return event;
};
