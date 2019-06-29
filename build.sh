#!/usr/bin/env bash

set -e
source ./env.sh

cd lambda/api && npm run build && cd -
cd lambda/pretokengeneration && npm run build && cd -
cd cdk && npm run build && cd -
