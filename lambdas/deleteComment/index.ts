import { Handler } from "aws-cdk-lib/aws-lambda";

import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { IComment } from "../../types";

const region = process.env.AWS_REGION || "";
const dynamo = new DynamoDBClient({ region });
const commentsTable: string = process.env.COMMENTS_TABLE || "";

interface IDeleteCommentsEvent {
  arguments: {
    userId: string;
    createdAt: number;
  };
}

export const handler: Handler = async (event: IDeleteCommentsEvent) => {
  try {
    const { userId, createdAt } = event.arguments;
    const getParams = {
      TableName: commentsTable,
      Key: {
        userId: { S: userId },
        createdAt: { N: createdAt.toString() },
      },
    };

    const getCommand = new GetItemCommand(getParams);
    let comment = await dynamo.send(getCommand);

    if (!comment.Item) {
      throw new Error("Comment does not exist");
    }

    const deleteParams = {
      TableName: commentsTable,
      Key: {
        userId: { S: userId },
        createdAt: { N: createdAt.toString() },
      },
    };

    const deleteCommand = new DeleteItemCommand(deleteParams);
    comment = await dynamo.send(deleteCommand);

    return true;
  } catch (error) {
    throw error;
  }
};
