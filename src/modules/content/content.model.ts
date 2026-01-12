import { Schema, model, Document, Types } from "mongoose";

// interface for the Generate Content document
export interface IGeneratedContent extends Document {
  userId: Types.ObjectId;
  prompt: string;
  contentType: string;
  generatedContent?: string; // Optional, as it will be populated later
  status: "pending" | "completed" | "failed";
  jobId: string; // Unique ID for the queue job
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema
const GeneratedContentSchema = new Schema<IGeneratedContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference for user model
      required: [true, "User ID is required"],
    },
    prompt: {
      type: String,
      required: [true, "Prompt is required"],
      trim: true,
      maxlength: [1000, "Prompt cannot be more than 1000 characters"],
    },
    contentType: {
      type: String,
      required: [true, "Content type is required"],
      enum: [
        "blog-post-outline",
        "blog-post",
        "product-description",
        "social-media-caption",
        "email-subject-line",
        "ad-copy",
      ],
      trim: true,
    },
    generatedContent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      required: true,
    },
    jobId: {
      type: String,
      required: [true, "Job ID is required"],
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// export thee model
export const GeneratedContent = model<IGeneratedContent>(
  "GeneratedContent",
  GeneratedContentSchema
);
