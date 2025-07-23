// packages/api/src/models/discussionResponse.ts
import { Schema, model, Types } from "mongoose";

export interface DiscussionResponse {
  questionId: Types.ObjectId;
  participantId: string;        // Could store socket ID or future auth sub
  bodyText: string;
}

const responseSchema = new Schema<DiscussionResponse>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionQuestion",
      required: true,
    },
    participantId: String,
    bodyText: { type: String, required: true },
  },
  { timestamps: true }
);

export const DiscussionResponseModel = model<DiscussionResponse>(
  "DiscussionResponse",
  responseSchema
);
