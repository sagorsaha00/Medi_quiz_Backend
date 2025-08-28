import mongoose from "mongoose";
import { Request, Response } from "express";
import { RequestWithUser } from "../Schema";
import { Question, SubmitResult } from "../database/quizModel";
export class QuizController {
  // ✅ Upload/Create Question
  async createQuestion(req: RequestWithUser, res: Response) {
    try {
      const data = req.body;

      if (Array.isArray(data)) {
        const questionsToSave = data.map((q) => {
          if (
            !q.question ||
            !q.optionA ||
            !q.optionB ||
            !q.optionC ||
            !q.optionD ||
            !q.correctAnswer ||
            !q.category
          ) {
            throw new Error("Missing fields in one of the questions");
          }

          if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
            throw new Error("Correct answer must be A, B, C, or D");
          }

          return {
            question: q.question.trim(),
            options: {
              A: q.optionA.trim(),
              B: q.optionB.trim(),
              C: q.optionC.trim(),
              D: q.optionD.trim(),
            },
            correctAnswer: q.correctAnswer,
            category: q.category.trim(),
            explanation: q.explanation?.trim(),
            createdBy: req.user?.id,
            isActive: true,
          };
        });

        const savedQuestions = await Question.insertMany(questionsToSave);

        return res.status(201).json({
          message: "Questions created successfully",
          success: true,
          count: savedQuestions.length,
          questions: savedQuestions,
        });
      }

      const {
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        category,
        explanation,
      } = data;

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

      await newQuestion.save();

      return res.status(201).json({
        message: "Question created successfully",
        success: true,
        question: newQuestion,
      });
    } catch (error: any) {
      console.error("Create question error:", error);
      return res.status(500).json({
        message: error.message || "Failed to create question",
        success: false,
      });
    }
  }

  // ✅ Get Questions for Quiz (without correct answers)
  async getQuestionsForQuiz(req: Request, res: Response) {
    console.log("question get hit");
    const { limit, category } = req.query;

    try {
      // Base filter - শুধু active questions নিবো
      const filter: any = { isActive: true };

      // Category wise filter করা হবে
      if (category && category !== "all") {
        filter.category = {
          $regex: new RegExp(category as string, "i"),
        };
      }

      // Limit set করা - default 20
      const questionLimit = parseInt(limit as string) || 20;

      const questions = await Question.aggregate([
        { $match: filter },

        // Random sampling করা হবে
        { $sample: { size: questionLimit } },

        // Required fields select করা হবে
        {
          $project: {
            _id: 1,
            question: 1,
            options: 1,
            category: 1,
            answer: 1,  
          },
        },
      ]);

      // যদি কোন প্রশ্ন না পাওয়া যায়
      if (questions.length === 0) {
        return res.status(404).json({
          message: category
            ? `No questions found for category: ${category}`
            : "No questions found for the specified criteria",
          success: false,
          count: 0,
          questions: [],
        });
      }

      
      return res.status(200).json({
        message: category
          ? `${category} questions fetched successfully`
          : "Questions fetched successfully",
        success: true,
        count: questions.length,
        category: category || "all",
        questions: questions.map((q) => ({
          id: q._id,
          question: q.question,
          options: q.options,
          category: q.category,
          answer: q.answer,  
        })),
      });
    } catch (error: any) {
      console.error("Get questions error:", error);
      return res.status(500).json({
        message: "Failed to fetch questions",
        success: false,
        error: error.message,
      });
    }
  }
  //submitQuiz Ans
  async SubmitQuizAns(req: RequestWithUser, res: Response) {
    // const { selectAns } = req.body;

    console.log("quiz submit");
    const { score, wrong, total, percentage } = req.body;

    try {
      if (
        score === undefined ||
        wrong === undefined ||
        total === undefined ||
        percentage === undefined
      ) {
        return res.status(400).json({
          message: "All fields are required (score, wrong, total, percentage)",
          success: false,
        });
      }

      const databaseResult = await SubmitResult.create({
        userId: req.user?.id,
        totalQuestions: total,
        correctAnswers: score,
        wrongAnswers: wrong,
        percentage: percentage,
      });

      databaseResult.save();

      return res.status(200).json({
        message: "Quiz submitted successfully",
        success: true,
        totalQuestions: total,
        correct: score,
        wrong: wrong,
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
      // const userId = req.user?.id;

      // if (!userId) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }

      //add userId filter
      const history = await SubmitResult.find({}).sort({
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
  //get one question
  async getRandomQuestion(req: Request, res: Response) {
    try {
      // active questions থেকে random একটি প্রশ্ন
      const count = await Question.countDocuments({ isActive: true });
      const randomIndex = Math.floor(Math.random() * count);

      const question = await Question.findOne({ isActive: true }).skip(
        randomIndex
      );

      if (!question) {
        return res
          .status(404)
          .json({ success: false, message: "No questions found" });
      }

      return res.status(200).json({
        success: true,
        question: {
          id: question._id,
          question: question.question,
          options: question.options,
          category: question.category,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
  //submitPracticeQuestion
  async submitPracticeAnswer(req: RequestWithUser, res: Response) {
    const { questionId, selectedOption } = req.body;

    if (!questionId || !selectedOption) {
      return res
        .status(400)
        .json({ success: false, message: "Question or option missing" });
    }
    const mongoQuestionId = new mongoose.Types.ObjectId(questionId);
    const question = await Question.findById(mongoQuestionId);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const isCorrect = question.correctAnswer === selectedOption;

    return res.status(200).json({
      success: true,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || null,
    });
  }
  async getAvailableCategories(req: Request, res: Response) {
    try {
      // সব unique categories খুঁজে বের করা হবে
      const categories = await Question.distinct("category", {
        isActive: true,
      });

      // প্রতি category তে কতগুলা প্রশ্ন আছে সেটা count করা হবে
      const categoryStats = await Question.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            category: "$_id",
            questionCount: "$count",
            _id: 0,
          },
        },
        { $sort: { category: 1 } },
      ]);

      return res.status(200).json({
        message: "Categories fetched successfully",
        success: true,
        totalCategories: categories.length,
        categories: categoryStats,
      });
    } catch (error: any) {
      console.error("Get categories error:", error);
      return res.status(500).json({
        message: "Failed to fetch categories",
        success: false,
        error: error.message,
      });
    }
  }
}
