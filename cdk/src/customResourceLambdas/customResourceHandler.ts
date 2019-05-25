import {
  Callback,
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from "aws-lambda";
import * as http from "http";

import * as https from "https";

import * as url from "url";

//see bottom of https://www.typescriptlang.org/docs/handbook/advanced-types.html
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Extend this class, implement the abstract methods, then create an instance of it
 *
 * export const handler = myCustomResourceHandler.handler
 */

export interface ResponseData {
  returnValue?: { [key: string]: string | undefined };
  physicalResourceId: string;

}

export abstract class CustomResourceHandler {
  private timeout: NodeJS.Timeout;

  public abstract async onCreate(event: CloudFormationCustomResourceCreateEvent, context: Context): Promise<ResponseData>;

  public abstract async onUpdate(event: CloudFormationCustomResourceUpdateEvent, context: Context): Promise<ResponseData>;

  public abstract async onDelete(event: CloudFormationCustomResourceDeleteEvent, context: Context): Promise<ResponseData>;

  public handler = async (event: CloudFormationCustomResourceEvent, context: Context, callback: Callback): Promise<void> => {
    // Install watchdog timer as the first thing
    this.setupWatchdogTimer(event, context, callback);
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

    if (event.RequestType === "Create") {

      console.log("CREATE!");
      try {
        const createResult = await this.onCreate(event, context);
        await this.sendResponse(event, context, "SUCCESS", createResult ? createResult : undefined);
      } catch (error) {
        await this.sendResponse(event, context, "FAILED", undefined, {
          "Message": "Resource creation failed!",
          "Error": error.message
        });
      }

    } else if (event.RequestType === "Update") {

      console.log("UDPATE!");

      try {
        let updateResult = await this.onUpdate(event, context);

        await this.sendResponse(event, context, "SUCCESS", updateResult ? updateResult : undefined);
      } catch (error) {
        console.error(error);
        await this.sendResponse(event, context, "FAILED", undefined, {
          "Message": "Resource creation failed!",
          "Error": error.message
        });
      }

    } else if (event.RequestType === "Delete") {

      console.log("DELETE!");
      try {
        console.log("before onDelete");
        let deleteResult = await this.onDelete(event, context);
        console.log("after onDelete");
        await this.sendResponse(event, context, "SUCCESS", deleteResult ? deleteResult : undefined);
      } catch (error) {
        console.error(error);
        await this.sendResponse(event, context, "FAILED", undefined, {
          "Message": "Resource deletion failed!",
          "Error": error.message
        });
      }

    } else {

      console.log("FAILED!");
      await this.sendResponse(event, context, "FAILED");
    }
  };


  //hat tip to: https://github.com/stelligent/cloudformation-custom-resources/blob/46ae1b7c7abdd67d456c9ae0bdc74d54d72a6ef1/lambda/nodejs/customresource.js#L23
  private setupWatchdogTimer(event: CloudFormationCustomResourceEvent, context: Context, callback: Callback) {
    // Set timer so it triggers one second before this function would timeout
    this.timeout = setTimeout(() => {
      console.log("Timeout FAILURE!");
      // Emit event to "sendResponse", then callback with an error from this
      // function
      new Promise(() => this.sendResponse(event, context, "FAILED"))
        .then(() => callback(new Error("Function timed out")));
    }, context.getRemainingTimeInMillis() - 1000);
  }

  // Send response to the pre-signed S3 URL
  private async sendResponse(event: CloudFormationCustomResourceEvent,
                             context: Context, responseStatus: "FAILED" | "SUCCESS",
                             responseData?: ResponseData,
                             error?: { "Message": string, "Error": string }): Promise<void> {
    try {

      let reason = `See the details in CloudWatch Log Stream: ${context.logGroupName}/${context.logStreamName}`;
      if (error) {
        reason += `\nMessage: ${error.Message}\nError: ${error.Error}`;
      }
      let physicalResourceId = context.logStreamName;
      if (responseData && responseData.physicalResourceId) {
        physicalResourceId = responseData.physicalResourceId;
      }

      let value: CloudFormationCustomResourceResponse & { NoEcho?: boolean } = {
        Status: responseStatus as any,
        Reason: reason,
        PhysicalResourceId: physicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData ? responseData.returnValue : undefined
      };
      const responseBody = JSON.stringify(value);

      console.log("RESPONSE BODY:\n", responseBody);

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

      await new Promise(((resolve, reject) => {
        const request = https.request(options, (response: http.IncomingMessage) => {
          console.log("STATUS: " + response.statusCode);
          console.log("HEADERS: " + JSON.stringify(response.headers));
          resolve();
          // Tell AWS Lambda that the function execution is done
          context.done()

        });

        request.on("error", (error: Error) => {
          console.log("sendResponse Error:" + error);
          reject();
          // Tell AWS Lambda that the function execution is done
          context.done()
        });

        // write data to request body
        request.write(responseBody);
        request.end();
      }));

      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

