import { Schema, model, models, Types } from "mongoose";

const SessionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
    facilitatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    moduleType: { type: String, default: "discussion" },
    status: { type: String, default: "draft" },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

const Session =
  models.Session || model("Session", SessionSchema);

export default Session;
