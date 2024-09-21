import { Handler } from "aws-cdk-lib/aws-lambda";

import {
  AttributeValue,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { IComment } from "../../types";

const region = process.env.AWS_REGION || "";
const dynamo = new DynamoDBClient({ region });
const commentsTable: string = process.env.COMMENTS_TABLE || "";

interface IUpdateCommentsEvent {
  arguments: {
    input: {
      userId: string;
      name?: string;
      content?: string;
      createdAt: number;
    };
  };
}

export const handler: Handler = async (event: IUpdateCommentsEvent) => {
  try {
    const { userId, name, content, createdAt } = event.arguments.input;
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

    const updateParams: UpdateItemCommandInput = {
      TableName: commentsTable,
      Key: {
        userId: { S: userId },
        createdAt: { N: createdAt.toString() },
      },
      UpdateExpression: "SET #name = :name, #content = :content",
      ExpressionAttributeNames: {
        "#name": "name",
        "#content": "content",
      },
      ExpressionAttributeValues: {
        ":name": { S: name ?? comment.Item.name.S } as AttributeValue,
        ":content": { S: content ?? comment.Item.content.S } as AttributeValue,
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    comment = await dynamo.send(updateCommand);

    return comment.Item as unknown as IComment;
  } catch (error) {
    throw error;
  }
};
