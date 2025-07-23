import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
    cognitoSub: { type: String, unique: true, index: true, required: true },
    name: String,
    email: { type: String, index: true },
    role: { type: String, default: "facilitator" }, // or enum later
  },
  { timestamps: true }
);

export default models.User || model("User", userSchema);

