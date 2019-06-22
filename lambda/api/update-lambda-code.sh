#!/usr/bin/env bash

set -e
source ../../env.sh

FUNC_NAME=`aws cloudformation describe-stacks --stack-name ${STACK_NAME} | \
 jq -r '.Stacks[].Outputs[] | select(.OutputKey == "LambdaFunctionName") | .OutputValue'`

npm run build
npm run package

aws lambda update-function-code \
    --region ${STACK_REGION} \
    --function-name ${FUNC_NAME} \
    --zip-file fileb://dist/function.zip

rm ./dist/function.zip
