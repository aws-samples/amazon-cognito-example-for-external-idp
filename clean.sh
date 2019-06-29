#!/usr/bin/env bash

cd lambda/api && npm run clean && cd -
cd lambda/pretokengeneration && npm run clean && cd -
cd cdk && npm run clean && cd -
