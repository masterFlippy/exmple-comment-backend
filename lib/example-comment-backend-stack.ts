import * as cdk from "aws-cdk-lib";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
  GraphqlApi,
  MappingTemplate,
  AuthorizationType,
  Definition,
} from "aws-cdk-lib/aws-appsync";
import {
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolIdentityProviderGoogle,
} from "aws-cdk-lib/aws-cognito";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export class ExampleCommentBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const secret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "GoogleClientSecrets",
      "google_credentials"
    );

    const userPool = new UserPool(this, "UserPool", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    userPool.addDomain("default", {
      cognitoDomain: {
        domainPrefix: "jonathanrengius987654321",
      },
    });

    const provider = new UserPoolIdentityProviderGoogle(this, "Google", {
      userPool,
      clientId: secret.secretValueFromJson("googleClientId").unsafeUnwrap(),
      clientSecret: secret
        .secretValueFromJson("googleClientSecret")
        .unsafeUnwrap(),
      scopes: ["email"],

      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
      },
    });

    const callbackUrl = "https://rengius.ninja/callback";

    const client = new UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE],
      oAuth: {
        callbackUrls: [callbackUrl, "http://localhost:3000/callback"],
      },
    });

    client.node.addDependency(provider);

    const commentsTable = new Table(this, "comments", {
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "createdAt", type: AttributeType.NUMBER },
    });

    const api = new GraphqlApi(this, "jonathanrengius", {
      name: "jonathanrengius",
      definition: Definition.fromFile("schema/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
            },
          },
        ],
      },
    });

    const getCommentsLambda = new NodejsFunction(
      this,
      "getCommentsLambdaHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: path.join(__dirname, `/../lambdas/getComments/index.ts`),
        handler: "handler",
        environment: {
          COMMENTS_TABLE: commentsTable.tableName,
        },
      }
    );

    const commentsDataSource = api.addLambdaDataSource(
      "getCommentsLambda",
      getCommentsLambda
    );

    commentsDataSource.createResolver(`getCommentsLambdaResolver`, {
      typeName: "Query",
      fieldName: "getComments",
      requestMappingTemplate: MappingTemplate.fromString(`{
        "version": "2017-02-28",
        "operation": "Invoke",
        "payload": {
          "arguments": $util.toJson($context.arguments)
        }
      }`),
    });
    commentsTable.grantReadData(getCommentsLambda);

    const createCommentLambda = new NodejsFunction(
      this,
      "createCommentLambdaHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: path.join(__dirname, `/../lambdas/createComment/index.ts`),
        handler: "handler",
        environment: {
          COMMENTS_TABLE: commentsTable.tableName,
        },
      }
    );
    const createCommentDataSource = api.addLambdaDataSource(
      "createCommentLambda",
      createCommentLambda
    );

    createCommentDataSource.createResolver(`createCommentLambdaResolver`, {
      typeName: "Mutation",
      fieldName: "createComment",
      requestMappingTemplate: MappingTemplate.fromString(`{
        "version": "2017-02-28",
        "operation": "Invoke",
        "payload": {
          "arguments": $util.toJson($context.arguments),
        }
      }`),
    });
    commentsTable.grantReadWriteData(createCommentLambda);

    const updateCommentLambda = new NodejsFunction(
      this,
      "updateCommentLambdaHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: path.join(__dirname, `/../lambdas/updateComment/index.ts`),
        handler: "handler",
        environment: {
          COMMENTS_TABLE: commentsTable.tableName,
        },
      }
    );
    const updateCommentDataSource = api.addLambdaDataSource(
      "updateCommentLambda",
      updateCommentLambda
    );

    updateCommentDataSource.createResolver(`updateCommentLambdaResolver`, {
      typeName: "Mutation",
      fieldName: "updateComment",
      requestMappingTemplate: MappingTemplate.fromString(`{
        "version": "2017-02-28",
        "operation": "Invoke",
        "payload": {
          "arguments": $util.toJson($context.arguments),
        }
      }`),
    });
    commentsTable.grantReadWriteData(updateCommentLambda);

    const deleteCommentLambda = new NodejsFunction(
      this,
      "deleteCommentLambdaHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: path.join(__dirname, `/../lambdas/deleteComment/index.ts`),
        handler: "handler",
        environment: {
          COMMENTS_TABLE: commentsTable.tableName,
        },
      }
    );
    const deleteCommentDataSource = api.addLambdaDataSource(
      "deleteCommentLambda",
      deleteCommentLambda
    );

    deleteCommentDataSource.createResolver(`deleteCommentLambdaResolver`, {
      typeName: "Mutation",
      fieldName: "deleteComment",
      requestMappingTemplate: MappingTemplate.fromString(`{
        "version": "2017-02-28",
        "operation": "Invoke",
        "payload": {
          "arguments": $util.toJson($context.arguments),
        }
      }`),
    });
    commentsTable.grantReadWriteData(deleteCommentLambda);
    new CfnOutput(this, "Api-Key", {
      exportName: "Api-Key",
      value: api.apiKey || "",
    });
  }
}
