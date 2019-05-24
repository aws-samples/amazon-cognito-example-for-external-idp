#!/usr/bin/env bash

set -e
export COGNITO_DOMAIN_NAME=reinforce2019


# ------------------
# API
# ------------------

echo "API"

pushd ./lambda/api/

echo "building..."
npm run build

echo "running tests..."
npm run test

popd

# ------------------
# PreTokenGeneration
# ------------------

echo "Cognito PreTokenGeneration Trigger"

pushd ./lambda/pretokengeneration/

echo "building..."
npm run build

#echo "running tests..."
#npm run test

popd

# ------------------
# Infrastructure
# ------------------
echo "Infrastructure"
pushd ./cdk/

echo "building..."
npm run build
