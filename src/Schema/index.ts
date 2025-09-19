import { Request } from "express";
import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatar: string;
  password: string;
  createdAt: Date;
}
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}
export interface IQuestion extends Document {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  explanation?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export type ISubmitResult = {
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  createdAt: Date;
};
