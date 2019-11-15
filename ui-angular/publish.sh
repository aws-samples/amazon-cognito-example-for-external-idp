set -e
source ../env.sh
BUCKET_NAME="external-idp-demo-angular-${STACK_ACCOUNT}-${STACK_REGION}"

echo "Building Angular UI"
npm run build

echo "Creating bucket if does not exists"
aws s3 mb "s3://${BUCKET_NAME}" --region "${STACK_REGION}" || true

# NOTE: since we want our UI to be accessible on the web, we are using a public read ACL for simplicity
# in a production scenario, a private bucket + CloudFront distribution is a more common approach

echo "Publishing files"
aws s3 sync --delete --acl public-read ./dist/ui-angular/ "s3://${BUCKET_NAME}"
echo "Done"

echo "------------------------------------------------"
echo "Edit env.sh and set APP_URL to be https://${BUCKET_NAME}.s3.amazonaws.com/index.html"
echo "Then re-deploy the backend stack (./deploy.sh)"
