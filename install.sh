#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will run npm install in all relevant sub-folders, build the project, and install the CDK toolkit"

npm install --prefix lambda/api
npm install --prefix lambda/pretokengeneration
npm install --prefix cdk
npm install --prefix ui-react
npm install --prefix ui-angular

./build.sh

npm run cdk --prefix cdk -- bootstrap
