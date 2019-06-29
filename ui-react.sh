#!/usr/bin/env bash

set -e
source ./env.sh

cd cdk

echo "generating config for ui-react based on stack outputs"

npm run generate-config -- ${STACK_NAME} ${STACK_REGION} ../ui-react/src/autoGenConfig.ts

cd -

cd ui-react
npm start
cd -
