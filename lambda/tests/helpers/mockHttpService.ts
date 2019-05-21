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

import {HttpRequest, HttpResponse, HttpService} from "../../src/services/httpService";

/**
 * a fixture that simulates an http client with a predetermined response
 */
export class MockHttpService implements HttpService {
  constructor(private fixedResponse: HttpResponse) {
  }

  // noinspection JSUnusedLocalSymbols
  public request(req: HttpRequest): Promise<HttpResponse> {
    return new Promise<HttpResponse>((resolve) => {
      resolve(this.fixedResponse);
    });
  }
}
