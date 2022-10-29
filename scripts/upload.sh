#!/usr/bin/env bash
set -xe

APPLICATION_NAME=ad-data-services
BUCKET=sla-$APPLICATION_NAME
SERVICE_KEY=$APPLICATION_NAME.zip

echo "building authentication services..."

yarn install --prod
rm -rf target/

mkdir -p target/node_modules
mkdir -p target/src

cp -r src/ target/src/
cp -r node_modules target/

cd target
zip -r $APPLICATION_NAME.zip .
cd -

aws s3 cp target/$APPLICATION_NAME.zip s3://$BUCKET/$SERVICE_KEY


rm -rf target/
yarn install

# util lambdas

aws lambda update-function-code \
    --s3-bucket $BUCKET --s3-key $SERVICE_KEY \
    --function-name ad-data-services-fluency-records

aws lambda update-function-code \
    --s3-bucket $BUCKET --s3-key $SERVICE_KEY \
    --function-name ad-data-services-fluency-spend

