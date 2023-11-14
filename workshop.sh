#!/usr/bin/env bash

export AWS_SDK_LOAD_CONFIG=1 # allows the SDK to load from config. see https://github.com/aws/aws-sdk-js/pull/1391
export STACK_NAME=ExternalIdPDemo
export STACK_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
EC2_AVAIL_ZONE=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`
export EC2_REGION="`echo \"$EC2_AVAIL_ZONE\" | sed 's/[a-z]$//'`"
aws configure set default.region ${EC2_REGION}
export STACK_REGION=$(aws configure get region)
export COGNITO_DOMAIN_NAME=auth-${STACK_ACCOUNT}-${STACK_REGION}
export APP_FRONTEND_DEPLOY_MODE=cloudfront

echo "this will run npm install in all relevant sub-folders, build the project, and install the CDK toolkit"

cd lambda
cd api
npm install
cd ..
cd pretokengeneration
npm install
cd ../..
cd cdk
npm install
cd ..
cd ui-react
npm install
cd ..

cd lambda
cd api
npm run build
cd ..
cd pretokengeneration
npm run build
cd ../..
cd cdk
npm run build 
cd ..
echo "Build successful"

touch ~/.aws/config
cd cdk
npm run cdk -- bootstrap
cd ..

echo "Building backend "

cd lambda
cd api
npm run build
cd ..
cd pretokengeneration
npm run build
cd ../..
cd cdk
npm run build 
cd ..
echo "Build successful"

echo "Deploying backend stack..."

# deploy the cdk stack (ignore the error in case it's due to 'No updates are to be performed')
cd cdk
npm run cdk-deploy --silent || true
cd ..
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${STACK_REGION}" --query "Stacks[].StackStatus[]" --output text)

if [[ "${STACK_STATUS}" != "CREATE_COMPLETE" && "${STACK_STATUS}" != "UPDATE_COMPLETE" ]]; then
  echo "Stack is in an unexpected status: ${STACK_STATUS}"
  exit 1
fi

echo "Generating UI configuration..."

echo "Generating config for UI based on stack outputs"
cd cdk
npm run generate-config -- "${STACK_NAME}" "${STACK_REGION}" ../ui-react/src/config/autoGenConfig.ts
cd ..
echo "Building UIs"

cd ui-react
npm run compile-config
npm run build
cd ..

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
  echo "Then run: cd ./ui-react && npm start # will launch the app in your browser at ${APP_URL}"

fi




