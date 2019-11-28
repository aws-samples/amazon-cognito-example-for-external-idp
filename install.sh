#!/usr/bin/env bash

set -e
source ./env.sh

echo "this will run npm install in all relevant sub-folders, build the project, and install the CDK toolkit"

npm install --silent --prefix lambda/api

npm install --silent --prefix lambda/pretokengeneration

npm install --silent --prefix lambda/pretokengeneration

npm install --silent --prefix cdk

npm install --silent --prefix ui-react

npm run build --silent --prefix cdk

npm run cdk --silent --prefix cdk -- bootstrap
