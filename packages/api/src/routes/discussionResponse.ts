import { Schema, model, models } from "mongoose";

const DiscussionResponseSchema = new Schema(
  {
    questionId: { 
      type: Schema.Types.ObjectId, 
      ref: "DiscussionQuestion", 
      required: true 
    },
    participantId: { 
      type: String, 
      required: false // Allow anonymous responses
    },
    bodyText: { 
      type: String, 
      required: true,
      maxlength: 2000 // Reasonable limit
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: true // This will add createdAt and updatedAt automatically
  }
);

// Create indexes for better query performance
DiscussionResponseSchema.index({ questionId: 1, createdAt: -1 });

const DiscussionResponse = models.DiscussionResponse || model("DiscussionResponse", DiscussionResponseSchema);

export default DiscussionResponse;