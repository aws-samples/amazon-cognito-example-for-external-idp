// /*
//  * Copyright 2019. Amazon.com, Inc. or its affiliates. All Rights Reserved.
//  *
//  *  Licensed under the Apache License, Version 2.0 (the "License").
//  *  You may not use this file except in compliance with the License.
//  *  A copy of the License is located at
//  *
//  *          http://aws.amazon.com/apache2.0/
//  *
//  *  or in the "license" file accompanying this file.
//  *  This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
//  *  OR CONDITIONS OF ANY KIND, either express or implied. See the
//  *  License for the specific language governing permissions
//  *  and limitations under the License.
//  *
//  */
//
// import {AWSError} from "aws-sdk";
// import {RefreshTokenEntry} from "../../src/model/refreshTokenEntry";
// import {StorageService} from "../../src/services/storageService";
//
// /**
//  * a mock storage service simulating DynamoDB
//  */
// export class MockStorageService implements StorageService {
//
//   public entries = new Map<string, RefreshTokenEntry>();
//
//   public async getPet(key: string): Promise<RefreshTokenEntry | undefined> {
//     return Promise.resolve(this.entries.get(key));
//   }
//
//   public async savePet(entry: RefreshTokenEntry): Promise<void> {
//     const existing = this.entries.get(entry.key);
//     if (existing) {
//       const awsError = new AWSError("ConditionalCheckFailedException");
//       awsError.code = "ConditionalCheckFailedException";
//       throw awsError;
//     }
//     this.entries.set(entry.key, entry);
//     return Promise.resolve();
//   }
//
//   public async updateRefreshTokenEntry(
//     key: string,
//     headers: { [p: string]: any },
//     expectedAccessLogSize: number,
//     clearRefreshToken?: boolean): Promise<void> {
//
//     const existing = this.entries.get(key);
//
//     if (existing) {
//       if (!existing.accessLog) {
//         existing.accessLog = [];
//       }
//
//       if (existing.accessLog.length !== expectedAccessLogSize) {
//         const awsError = new AWSError("ConditionalCheckFailedException");
//         awsError.code = "ConditionalCheckFailedException";
//         throw awsError;
//       }
//
//       existing.accessLog.push({timestamp: Date.now(), headers});
//
//       if (clearRefreshToken) {
//         delete existing.refreshToken;
//       }
//     }
//   }
//
// }
