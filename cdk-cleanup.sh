#!/usr/bin/env bash

set -e
source ./env.sh

echo "Destroying CDK Cloudformation Stack  -- Some manual removal required"
npm run cdk-destroy --prefix cdk 