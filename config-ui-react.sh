#!/usr/bin/env bash

set -e
source ./env.sh

pushd ./cdk/

echo "generating config for ui-react based on stack outputs"

npm run generate-config -- ${STACK_NAME} ../ui-react/src/autoGenConfig.ts

popd


