import { Handler } from "aws-cdk-lib/aws-lambda";

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { IComment } from "../../types";

const region = process.env.AWS_REGION || "";
const dynamo = new DynamoDBClient({ region });
const commentsTable: string = process.env.COMMENTS_TABLE || "";

interface ICreateCommentsEvent {
  arguments: {
    input: {
      postId: string;
      userId: string;
      name: string;
      content: string;
      createdAt: number;
    };
  };
}

export const handler: Handler = async (event: ICreateCommentsEvent) => {
  try {
    const { postId, userId, name, content, createdAt } = event.arguments.input;
    const getParams = {
      TableName: commentsTable,
      Key: {
        userId: { S: userId },
        createdAt: { N: createdAt.toString() },
      },
    };

    const getCommand = new GetItemCommand(getParams);
    let comment = await dynamo.send(getCommand);

    if (comment.Item) {
      throw new Error("Comment already exists");
    }

    const putParams = {
      TableName: commentsTable,
      Item: {
        postId: { S: postId },
        userId: { S: userId },
        name: { S: name },
        content: { S: content },
        createdAt: { N: createdAt.toString() },
      },
    };

    const putCommand = new PutItemCommand(putParams);
    comment = await dynamo.send(putCommand);

    return comment.Item as unknown as IComment;
  } catch (error) {
    throw error;
  }
};
