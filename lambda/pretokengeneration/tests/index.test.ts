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

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.undefined;
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

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.undefined;
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

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.undefined;
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test"]);

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

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.undefined;
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["DemoAppAdmins", "DemoAppUsers", "test"]);
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

    expect(result.response.claimsOverrideDetails!.claimsToSuppress).to.be.undefined;
    // tslint:disable-next-line:max-line-length
    expect(result.response.claimsOverrideDetails!.groupOverrideDetails!.groupsToOverride).to.have.members(["test", "test2"]);
    // expect(result.response.claimsOverrideDetails!.claimsToAddOrOverride).to.be.undefined;

  });

});
