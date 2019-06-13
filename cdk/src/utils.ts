import * as aws from "aws-sdk";
import {CloudFormation} from "aws-sdk";

export class Utils {

  private static readonly cfn = new aws.CloudFormation();

  static async getStackOutputs(stackName: string): Promise<CloudFormation.Output[]> {
    const result = await this.cfn.describeStacks({StackName: stackName}).promise();
    return result.Stacks![0].Outputs!;
  }

  static requireFromEnv(variableName: string) {
    const variable = process.env[variableName];
    if (!variable) {
      throw new Error(`${variable} environment variable must be defined`);
    }
    return variable
  }
}


