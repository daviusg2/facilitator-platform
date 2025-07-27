import { Schema, model, models, Types } from "mongoose";

export interface DiscussionQuestion {
  sessionId: Types.ObjectId;
  order: number;
  promptText: string;
  isActive: boolean;
}

const schema = new Schema<DiscussionQuestion>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    order: { type: Number, required: true },
    promptText: { type: String, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ⬇️ If it already exists, reuse it; otherwise create it
export default models.DiscussionQuestion || model("DiscussionQuestion", schema);


