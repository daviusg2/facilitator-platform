import { Schema, model, models } from "mongoose";

const organisationSchema = new Schema(
  {
    name: { type: String, required: true },
    planTier: { type: String, default: "FREE" },
  },
  { timestamps: true }
);

export default models.Organisation || model("Organisation", organisationSchema);

