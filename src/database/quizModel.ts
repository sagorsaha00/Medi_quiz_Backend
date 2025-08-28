// models/Question.ts
import mongoose, { Schema } from "mongoose";
import { IQuestion, ISubmitResult } from "../Schema";

const QuestionSchema: Schema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    options: {
      A: { type: String, required: true, trim: true, maxlength: 200 },
      B: { type: String, required: true, trim: true, maxlength: 200 },
      C: { type: String, required: true, trim: true, maxlength: 200 },
      D: { type: String, required: true, trim: true, maxlength: 200 },
    },
    correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    explanation: { type: String, trim: true, maxlength: 1000 }, // optional
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
QuestionSchema.index({ category: 1, difficulty: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ isActive: 1 });

export const Question = mongoose.model<IQuestion>(
  "QuizQuestion",
  QuestionSchema
);

//submitsResult_Schema
const SubmitResultSchema = new Schema<ISubmitResult>({
  userId: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  percentage: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const SubmitResult = mongoose.model<ISubmitResult>(
  "SubmitResult",
  SubmitResultSchema
);
