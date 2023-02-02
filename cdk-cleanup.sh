#!/usr/bin/env bash

set -e
source ./env.sh

echo "Destroying CDK Cloudformation Stack  -- Some manual removal required"
cd cdk
npm run cdk-destroy
cd ..