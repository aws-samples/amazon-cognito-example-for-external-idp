#!/usr/bin/env bash

set -e
source ./env.sh

echo "Building backend "

./build.sh

echo "Deploying backend stack..."

# deploy the cdk stack (ignore the error in case it's due to 'No updates are to be performed')
npm run cdk-deploy --silent --prefix cdk || true

STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${STACK_REGION}" --query "Stacks[].StackStatus[]" --output text)

if [[ "${STACK_STATUS}" != "CREATE_COMPLETE" && "${STACK_STATUS}" != "UPDATE_COMPLETE" ]]; then
  echo "Stack is in an unexpected status: ${STACK_STATUS}"
  exit 1
fi

echo "Generating UI configuration..."

./build-ui.sh

BUCKET_NAME=$(node --print "require('./ui-react/src/config/autoGenConfig.js').default.uiBucketName")
APP_URL=$(node --print "require('./ui-react/src/config/autoGenConfig.js').default.appUrl")
COGNITO_INSTRUCTIONS="Create some users (in the pool or your IdP) and assign them the groups 'pet-app-admins' and/or 'pet-app-users'"

if [[ "${BUCKET_NAME}" != "" ]]; then


  if [[ "${APP_FRONTEND_DEPLOY_MODE}" == "s3" ]]; then
    echo "Publishing frontend to ${BUCKET_NAME}"

    # NOTE: for development / demo purposes only, we use a public-read ACL on the frontend static files
    # in a production scenario use CloudFront and keep the s3 objects private
    aws s3 sync --delete --acl public-read ./ui-react/build/ "s3://${BUCKET_NAME}" &> /dev/null
    echo "${COGNITO_INSTRUCTIONS}"
    echo "Then visit the app at: ${APP_URL}"
  fi

  if [[ "${APP_FRONTEND_DEPLOY_MODE}" == "cloudfront" ]]; then
    echo "Publishing frontend to ${BUCKET_NAME}, will be availabing via CloudFront"

    # since we serve from CloudFront, we can keep the objects private, so we don't pass --acl public-read here
    aws s3 sync --delete ./ui-react/build/ "s3://${BUCKET_NAME}" &> /dev/null

    echo "${COGNITO_INSTRUCTIONS}"
    echo "Then visit the app at: ${APP_URL} (may take a few minutes for the distribution to finish deployment)"
  fi


elif [[ "${APP_URL}" == "http://localhost"* ]]; then

  echo "${COGNITO_INSTRUCTIONS}"
  echo "Then run: cd ./ui-angular && npm start # will launch the app in your browser at ${APP_URL}"

fi




