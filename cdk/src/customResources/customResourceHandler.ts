import {
  Callback,
  CloudFormationCustomResourceCreateEvent, CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse, CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";
import * as http from "http";

/**
 * Extend this class, implement the abstract methods, then create an instance of it
 *
 * export const handler = myCustomResourceHandler.handler
 */
export abstract class CustomResourceHandler<T extends {[key: string]: string | undefined}> {
  public abstract async onCreate(event: CloudFormationCustomResourceCreateEvent, context: Context): Promise<T | void>;

  public abstract async onUpdate(event: CloudFormationCustomResourceUpdateEvent, context: Context): Promise<T | void>;

  public abstract async onDelete(event: CloudFormationCustomResourceDeleteEvent, context: Context): Promise<T | void>;

  public async handler(event: CloudFormationCustomResourceEvent, context: Context, callback: Callback): Promise<void> {
    // Install watchdog timer as the first thing
    this.setupWatchdogTimer(event, context, callback);
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

    if (event.RequestType === "Create") {

      console.log("CREATE!");
      try {
        const createResult = await this.onCreate(event, context);
        this.sendResponse(event, context, "SUCCESS", createResult ? createResult : undefined);
      } catch (error) {
        this.sendResponse(event, context, "FAILED", {"Message": "Resource creation failed!", "Error": error.message});
      }


    } else if (event.RequestType === "Update") {

      console.log("UDPATE!");

      try {
        let updateResult = await this.onUpdate(event, context);

        this.sendResponse(event, context, "SUCCESS", updateResult ? updateResult : undefined);
      } catch (error) {
        console.error(error);
        this.sendResponse(event, context, "FAILED", {"Message": "Resource creation failed!", "Error": error.message});
      }

    } else if (event.RequestType === "Delete") {

      console.log("DELETE!");
      try {
        let deleteResult = await this.onDelete(event, context);
        this.sendResponse(event, context, "SUCCESS", deleteResult ? deleteResult : undefined);
      } catch (error) {
        console.error(error);
        this.sendResponse(event, context, "FAILED", {"Message": "Resource deletion failed!", "Error": error.message});
      }

    } else {

      console.log("FAILED!");
      this.sendResponse(event, context, "FAILED");

    }

  };


  //hat tip to: https://github.com/stelligent/cloudformation-custom-resources/blob/46ae1b7c7abdd67d456c9ae0bdc74d54d72a6ef1/lambda/nodejs/customresource.js#L23
  private setupWatchdogTimer(event: CloudFormationCustomResourceEvent, context: Context, callback: Callback) {
    const timeoutHandler = () => {
      console.log("Timeout FAILURE!");
      // Emit event to "sendResponse", then callback with an error from this
      // function
      new Promise(() => this.sendResponse(event, context, "FAILED"))
        .then(() => callback(new Error("Function timed out")));
    };

    // Set timer so it triggers one second before this function would timeout
    setTimeout(timeoutHandler, context.getRemainingTimeInMillis() - 1000);
  }

  // Send response to the pre-signed S3 URL
  private sendResponse(event: CloudFormationCustomResourceEvent, context: Context, responseStatus: "FAILED" | "SUCCESS", responseData?: T | { "Message": string, "Error": string }) {

    let value: CloudFormationCustomResourceResponse & {NoEcho: boolean} = {
      Status: responseStatus as any,
      Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
      PhysicalResourceId: context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: true,
      Data: responseData
    };
    const responseBody = JSON.stringify(value);

    console.log("RESPONSE BODY:\n", responseBody);

    const https = require("https");
    const url = require("url");

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length
      }
    };

    console.log("SENDING RESPONSE...\n");

    const request = https.request(options, (response: http.IncomingMessage) => {
      console.log("STATUS: " + response.statusCode);
      console.log("HEADERS: " + JSON.stringify(response.headers));
      // Tell AWS Lambda that the function execution is done
      context.done();
    });

    request.on("error", (error: Error) => {
      console.log("sendResponse Error:" + error);
      // Tell AWS Lambda that the function execution is done
      context.done();
    });

    // write data to request body
    request.write(responseBody);
    request.end();
  }
}

