#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ExampleCommentBackendStack } from "../lib/example-comment-backend-stack";

const app = new cdk.App();
new ExampleCommentBackendStack(app, "ExampleCommentBackendStack", {
  env: { account: "account_id", region: "region" },
});
