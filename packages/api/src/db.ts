import mongoose from "mongoose";

export async function connectToDatabase(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (e) {
    console.error("❌ DB connect error:", e);
    throw e;                       // bubble up
  }
}

