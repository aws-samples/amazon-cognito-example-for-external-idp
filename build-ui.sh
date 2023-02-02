#!/usr/bin/env bash

set -e
source ./env.sh


echo "Generating config for UI based on stack outputs"
cd cdk
npm run generate-config -- "${STACK_NAME}" "${STACK_REGION}" ../ui-react/src/config/autoGenConfig.ts
cd ..
echo "Building UIs"

cd ui-react
npm run compile-config
npm run build
cd ..
cd ui-angular
npm run build 
cd ..