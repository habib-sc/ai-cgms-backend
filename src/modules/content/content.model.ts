import { Schema, model, Document, Types } from "mongoose";

// interface for the  Content document
export interface IContent extends Document {
  userId: Types.ObjectId;
  prompt: string;
  contentType: string;
  title?: string;
  tags?: string[];
  notes?: string;
  generatedContent?: string;
  contentError?: string;
  status: "pending" | "processing" | "queued" | "completed" | "failed";
  jobId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema
const ContentSchema = new Schema<IContent>(
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
    contentError: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "queued", "completed", "failed"],
      default: "pending",
      required: true,
    },
    jobId: {
      type: String,
      required: [true, "Job ID is required"],
      unique: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// export thee model
export const Content = model<IContent>("Content", ContentSchema);
