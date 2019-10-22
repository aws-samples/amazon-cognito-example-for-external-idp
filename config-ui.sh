#!/usr/bin/env bash

set -e
source ./env.sh

cd cdk

echo "generating config for UI based on stack outputs"

npm run generate-config -- "${STACK_NAME}" "${STACK_REGION}" ../ui-react/src/config/autoGenConfig.js
