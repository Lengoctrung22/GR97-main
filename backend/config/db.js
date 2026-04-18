import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  if (
    uri.includes("<user>") ||
    uri.includes("<pass>") ||
    uri.includes("<cluster>")
  ) {
    throw new Error(
      "MONGODB_URI is still a template. Replace <user>, <pass>, <cluster> with real Atlas values in backend/.env"
    );
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};
