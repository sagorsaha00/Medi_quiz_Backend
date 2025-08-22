import mongoose from "mongoose";
import { Request, Response } from "express";
import { RequestWithUser } from "../Schema";
import { Question, SubmitResult } from "../database/quizModel";
export class QuizController {
  // ✅ Upload/Create Question
  async createQuestion(req: RequestWithUser, res: Response) {
    const {
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      category,
      explanation,
    } = req.body;

    if (
      !question ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !correctAnswer ||
      !category
    ) {
      return res.status(400).json({
        message:
          "All fields are required (question, optionA, optionB, optionC, optionD, correctAnswer, category)",
        success: false,
      });
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return res.status(400).json({
        message: "Correct answer must be A, B, C, or D",
        success: false,
      });
    }

    try {
      const newQuestion = new Question({
        question: question.trim(),
        options: {
          A: optionA.trim(),
          B: optionB.trim(),
          C: optionC.trim(),
          D: optionD.trim(),
        },
        correctAnswer,
        category: category.trim(),
        explanation: explanation?.trim(),
        createdBy: req.user?.id,
        isActive: true,
      });
      console.log("question", newQuestion);

      await newQuestion.save();

      return res.status(201).json({
        message: " Question created successfully",
        success: true,
        question: {
          id: newQuestion._id,
          question: newQuestion.question,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
          category: newQuestion.category,
          explanation: newQuestion.explanation,
        },
      });
    } catch (error: any) {
      console.error("Create question error:", error);
      return res.status(500).json({
        message: "Failed to create question",
        success: false,
      });
    }
  }

  // ✅ Get Questions for Quiz (without correct answers)
  async getQuestionsForQuiz(req: Request, res: Response) {
    const { limit } = req.query;

    try {
      const filter: any = { isActive: true };
      const questions = await Question.find(filter).limit(
        parseInt(limit as string)
      );

      if (questions.length === 0) {
        return res.status(404).json({
          message: "No questions found for the specified criteria",
          success: false,
        });
      }

      return res.status(200).json({
        message: "Questions fetched successfully",
        success: true,
        count: questions.length,
        questions: questions.map((q) => ({
          id: q._id,
          question: q.question,
          options: q.options,
          category: q.category,
        })),
      });
    } catch (error: any) {
      console.error("Get questions error:", error);
      return res.status(500).json({
        message: "Failed to fetch questions",
        success: false,
      });
    }
  }

  //submitQuiz Ans
  async SubmitQuizAns(req: RequestWithUser, res: Response) {
    const { selectAns } = req.body;

    if (!selectAns || !Array.isArray(selectAns) || selectAns.length === 0) {
      return res.status(400).json({
        message: "You did not select any question",
        success: false,
      });
    }

    try {
      const questionIds = selectAns.map((a: any) => a.questionId);

      console.log("questionIds", questionIds);

      const questions = await Question.find({ _id: { $in: questionIds } });
      console.log("questions", questions);

      let correctCount = 0;
      let wrongCount = 0;

      const results = selectAns.map((ans: any) => {
        const question = questions.find(
          (q: any) => q._id.toString() === ans.questionId
        );

        if (!question) {
          return {
            questionId: ans.questionId,
            selectedOption: ans.selectedOption,
            isCorrect: false,
            correctAnswer: null,
          };
        }

        const isCorrect = question.correctAnswer === ans.selectedOption;

        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }

        var ResultInfo = {
          questionId: ans.questionId,
          question: question.question,
          selectedOption: ans.selectedOption,
          correctAnswer: question.correctAnswer,
          isCorrect,
        };

        return {
          ResultInfo,
        };
      });

      const databaseResult = await SubmitResult.create({
        userId: req.user?.id,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
      });

      databaseResult.save();

      return res.status(200).json({
        message: "Quiz submitted successfully",
        success: true,
        totalQuestions: questions.length,
        correct: correctCount,
        wrong: wrongCount,
        results,
      });
    } catch (error: any) {
      console.error("Submit quiz error:", error);
      return res.status(500).json({
        message: "Failed to submit quiz answers",
        success: false,
      });
    }
  }

  // ✅ Get User's Quiz Result History
  async getUserHistory(req: RequestWithUser, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const history = await SubmitResult.find({ userId }).sort({
        createdAt: -1,
      });

      return res.status(200).json({
        success: true,
        count: history.length,
        history,
      });
    } catch (error) {
      console.error("getUserHistory error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}
