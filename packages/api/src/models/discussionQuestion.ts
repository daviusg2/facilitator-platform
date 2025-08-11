// packages/api/src/models/discussionQuestion.ts
import { Schema, model, models, Types } from "mongoose";

// Force delete existing model if it exists
if (models.DiscussionQuestion) {
  delete models.DiscussionQuestion;
}

export interface DiscussionQuestion {
  sessionId: Types.ObjectId;
  order: number;
  promptText: string;
  isActive: boolean;
  
  // Timer functionality - simplified
  timerDurationMinutes?: number;
  timerStartedAt?: Date;
  timerExpiresAt?: Date;
  timerExtendedMinutes?: number;
  
  // Duplication tracking
  originalQuestionId?: Types.ObjectId;
  duplicatedFromSession?: Types.ObjectId;
  
  // Metadata
  createdBy?: string;
  notes?: string;
}

const schema = new Schema<DiscussionQuestion>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    order: { type: Number, required: true },
    promptText: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    
    // Timer fields - simplified, no methods
    timerDurationMinutes: {
      type: Number,
      min: 1,
      max: 480,
      required: false
    },
    timerStartedAt: {
      type: Date,
      required: false
    },
    timerExpiresAt: {
      type: Date,
      required: false
    },
    timerExtendedMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Duplication fields
    originalQuestionId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionQuestion",
      required: false
    },
    duplicatedFromSession: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: false
    },
    
    // Metadata
    createdBy: {
      type: String,
      required: false
    },
    notes: {
      type: String,
      maxlength: 500,
      required: false
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
schema.index({ sessionId: 1, order: 1 });
schema.index({ originalQuestionId: 1 });
schema.index({ timerExpiresAt: 1 });
schema.index({ isActive: 1, timerExpiresAt: 1 });

// ⬇️ If it already exists, reuse it; otherwise create it
export default models.DiscussionQuestion || model("DiscussionQuestion", schema);


