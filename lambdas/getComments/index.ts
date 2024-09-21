import { Handler } from "aws-cdk-lib/aws-lambda";

import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { IComment } from "../../types";

const region = process.env.AWS_REGION || "";
const dynamo = new DynamoDBClient({ region });
const commentsTable: string = process.env.COMMENTS_TABLE || "";

interface ICommentsEvent {
  arguments: {
    postId?: string;
    createdAt?: string;
  };
}

export const handler: Handler = async (event: ICommentsEvent) => {
  try {
    let comments: IComment[] = [];

    const postId = event.arguments.postId;
    const createdAt = event.arguments.createdAt;
    const params: ScanCommandInput = {
      TableName: commentsTable,
      ...(postId && createdAt
        ? {
            FilterExpression: "postId = :postId AND createdAt = :createdAt",
            ExpressionAttributeValues: {
              ":postId": { S: postId },
              ":createdAt": { S: createdAt },
            },
          }
        : {}),
    };

    const command = new ScanCommand(params);
    const response = await dynamo.send(command);

    if (response.Items && response.Items.length > 0) {
      comments = response.Items.map((item) => ({
        postId: item.postId.S || "",
        userId: item.userId.S || "",
        name: item.name.S || "",
        content: item.content.S || "",
        createdAt: Number(item.createdAt.N),
      }));
    }

    return comments;
  } catch (error) {
    throw error;
  }
};
