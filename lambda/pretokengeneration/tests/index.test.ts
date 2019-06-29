/* tslint:disable:no-unused-expression */

import {handler} from "../src";
import {expect} from "chai";

describe("lambda handler", () => {

  it("GET success - empty params", async () => {

    const result = await handler({
      request: {
        groupConfiguration:
          {
            groupsToOverride: [],
            iamRolesToOverride: [],
            preferredRole: [],
          },
        userAttributes: {},
      },
      response: {},
    });

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.empty;
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.be.empty;
    expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });

  it("GET success - via attributes", async () => {

    const result = await handler({
      request: {
        groupConfiguration:
          {
            groupsToOverride: [],
            iamRolesToOverride: [],
            preferredRole: [],
          },
        userAttributes: {
          "custom:groups": "[test1, test2]",
        },
      },
      response: {},
    });

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.contain("custom:groups");
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test1", "test2"]);
    // expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });

  it("GET success - prior groups, empty attribute", async () => {

    const result = await handler({
      request: {
        groupConfiguration:
          {
            groupsToOverride: ["test"],
            iamRolesToOverride: [],
            preferredRole: [],
          },
        userAttributes: {
          "custom:groups": "[]",
        },
      },
      response: {},
    });

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.contain("custom:groups");
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test"]);
    // expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });
  it("GET success - mix", async () => {

    const result = await handler({
      request: {
        groupConfiguration:
          {
            groupsToOverride: ["test"],
            iamRolesToOverride: [],
            preferredRole: [],
          },
        userAttributes: {
          "custom:groups": "[DemoAppAdmins, DemoAppUsers]",
        },
      },
      response: {},
    });

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.contain("custom:groups");
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test", "DemoAppAdmins", "DemoAppUsers"]);
    // expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });

  it("GET success - prior groups, no attribute", async () => {

    const result = await handler({
      request: {
        groupConfiguration:
          {
            groupsToOverride: ["test", "test2"],
            iamRolesToOverride: [],
            preferredRole: [],
          },
        userAttributes: {},
      },
      response: {},
    });

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.empty;
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test", "test2"]);
    // expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });
  it("GET success - remove idp auto generated groups", async () => {

    const result = await handler({
      "userPoolId": "us-west-2_abc",
      "request": {
        "userAttributes": {
          "cognito:user_status": "EXTERNAL_PROVIDER",
          "custom:groups": "[DemoAppAdmins, DemoAppUsers]"
        },
        "groupConfiguration": {
          "groupsToOverride": ["us-west-2_abc"],
          "iamRolesToOverride": [],
          "preferredRole": null
        }
      },
      "response": {"claimsOverrideDetails": null}
    });

    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["DemoAppAdmins", "DemoAppUsers"]);

  });
  it("GET success - remove idp auto generated groups - one group", async () => {

    const result = await handler({
      "userPoolId": "us-west-2_abc",
      "request": {
        "userAttributes": {
          "cognito:user_status": "EXTERNAL_PROVIDER",
          "custom:groups": "DemoAppUsers"
        },
        "groupConfiguration": {
          "groupsToOverride": ["us-west-2_abc"],
          "iamRolesToOverride": [],
          "preferredRole": null
        }
      },
      "response": {"claimsOverrideDetails": null}
    });

    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["DemoAppUsers"]);

  });

});
