import {User} from "./user";
import {expect} from "chai";

describe("User class should", ()=>{

  it("return the correct groups based on the claim", () => {
    const groups = ["a","b","c"];
    const user = new User({
      getSignInUserSession() {
        return {
          isValid() {
            return true;
          },
          getIdToken() {
            return {
              decodePayload() {

                return {
                  "cognito:groups": groups
                }
              }
            }
          }
        }
      }
    } as any);

    console.log(user.getGroups());
    expect(user.getGroups()).to.have.members(groups);

  });

  it("return an empty array if no groups", () => {
    const user = new User({
      getSignInUserSession() {
        return {
          isValid() {
            return true;
          },
          getIdToken() {
            return {
              decodePayload() {
                return {}
              }
            }
          }
        }
      }
    } as any);

    console.log(user.getGroups());
    expect(user.getGroups()).to.be.empty;

  });

  it("return an empty object if invalid ", () => {
    const user = new User({
      getSignInUserSession() {
        return {
          isValid() {
            return false;
          }
        }
      }
    } as any);

    console.log(user.getClaims());
    expect(user.getClaims()).eql({});

  })
  it("return an empty object if session is null ", () => {
    const user = new User({
      getSignInUserSession(): any {
        return null;
      }
    } as any);

    console.log(user.getClaims());
    expect(user.getClaims()).eql({});

  })


});

