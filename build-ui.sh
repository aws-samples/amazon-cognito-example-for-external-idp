#!/usr/bin/env bash

set -e
source ./env.sh


echo "Generating config for UI based on stack outputs"

npm run generate-config --prefix cdk -- "${STACK_NAME}" "${STACK_REGION}" ../ui-react/src/config/autoGenConfig.ts

echo "Building UIs"

npm run compile-config --prefix ui-react
npm run build --prefix ui-react
npm run build --prefix ui-angular
