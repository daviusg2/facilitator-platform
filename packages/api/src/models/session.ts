// packages/api/src/models/session.ts
import { Schema, model, Types } from "mongoose";

export interface Session {
  orgId: Types.ObjectId;
  facilitatorId: Types.ObjectId;      // For now we’ll store the Cognito sub here later
  title: string;
  status: "DRAFT" | "LIVE" | "CLOSED";
  moduleType: "discussion";
  startAt?: Date;
  endAt?: Date;
}

const sessionSchema = new Schema<Session>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
    facilitatorId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    status: { type: String, default: "DRAFT" },
    moduleType: { type: String, default: "discussion" },
    startAt: Date,
    endAt: Date,
  },
  { timestamps: true }
);

export const SessionModel = model<Session>("Session", sessionSchema);
