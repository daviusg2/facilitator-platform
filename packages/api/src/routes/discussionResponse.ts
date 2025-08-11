// packages/api/src/models/discussionResponse.ts
import { Schema, model, Types } from "mongoose";

export interface DiscussionResponse {
  questionId: Types.ObjectId;
  participantId: string;        // Could store socket ID or future auth sub
  bodyText: string;
  // Add moderation fields
  isHidden?: boolean;
  isFlagged?: boolean;
  isPinned?: boolean;
  moderatedAt?: Date;
  moderatedBy?: string;
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
    // Add moderation fields
    isHidden: {
      type: Boolean,
      default: false
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    moderatedAt: {
      type: Date,
      required: false
    },
    moderatedBy: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

// Create indexes for better query performance
responseSchema.index({ questionId: 1, createdAt: -1 });
responseSchema.index({ questionId: 1, isPinned: -1, createdAt: -1 }); // For pinned-first sorting
responseSchema.index({ isFlagged: 1 }); // For finding flagged responses

export const DiscussionResponseModel = model<DiscussionResponse>(
  "DiscussionResponse",
  responseSchema
);