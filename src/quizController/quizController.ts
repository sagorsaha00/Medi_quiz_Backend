import mongoose from "mongoose";
import { Request, Response } from "express";
import { RequestWithUser } from "../Schema";
import { Question, SubmitResult } from "../database/quizModel";
export class QuizController {
  //  Upload/Create Question
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
            createdBy: req.user?.id ? req.user.id.toString() : undefined,
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
        createdBy: req.user?.id ? req.user.id.toString() : undefined,
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

  //get all questions for quiz
  async getQuestionsForQuiz(req: Request, res: Response) {
    console.log("question get hit");
    const { limit, category, excludeIds } = req.query;

    try {
      const filter: any = { isActive: true };


      if (category && category !== "all") {
        filter.category = {
          $regex: new RegExp(category.toString(), "i"),
        };
      }


      if (excludeIds) {
        const idsArray = (excludeIds.toString())
          .split(",")
          .map((id) => new mongoose.Types.ObjectId(id as unknown as string));
        filter._id = { $nin: idsArray };
      }

      const questionLimit = Number(limit) || 20;


      const questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: questionLimit } },
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

      if (questions.length === 0) {
        return res.status(404).json({
          message: "No more new questions available",
          success: false,
          count: 0,
          questions: [],
        });
      }

      return res.status(200).json({
        message: "Questions fetched successfully",
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
  //  Get users Quiz Result History
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
      const { excludeIds, category } = req.query;

      const filter: any = { isActive: true };


      if (category && category !== "all") {
        filter.category = { $regex: new RegExp(category.toString(), "i") };
      }


      if (excludeIds) {
        const idsArray = (excludeIds.toString())
          .split(",")
          .map((id) => new mongoose.Types.ObjectId(id as unknown as string));
        filter._id = { $nin: idsArray };
      }

      const count = await Question.countDocuments(filter);
      if (count === 0) {
        return res.status(404).json({
          success: false,
          message: "No more questions in this category",
        });
      }

      const randomIndex = Math.floor(Math.random() * count);
      const question = await Question.findOne(filter).skip(randomIndex);

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
    const mongoQuestionId = new mongoose.Types.ObjectId(questionId as unknown as string);
    //mongoose.Types.ObjectId.isValid()

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
      const categories = await Question.distinct("category", {
        isActive: true,
      });

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

      const allQuestionSum = categoryStats.reduce((acc, curr) => {
        return acc + curr.questionCount;
      }, 0);

      console.log("all Question Count", allQuestionSum);

      return res.status(200).json({
        message: "Categories fetched successfully",
        success: true,
        totalCategories: categories.length,
        categories: categoryStats,
        TotalQuestion: allQuestionSum,
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
  async getAllQuestion(req: Request, res: Response) {
    const countAllQuestion = await Question.countDocuments();

    const groupByCategory = await Question.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$category",
          totalQuestions: { $sum: 1 },
          questions: { $push: "$$ROOT" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    res.status(201).json({
      TotalQuestion: countAllQuestion,
      allData: groupByCategory,
    });
  }
  async getQuestionsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.query;

      if (!category) {
        return res.status(400).json({
          message: "Category is required",
          success: false,
        });
      }

      // নির্দিষ্ট ক্যাটাগরির সব প্রশ্ন খুঁজে বের করো
      const questions = await Question.find({ category, isActive: true });

      if (!questions.length) {
        return res.status(404).json({
          message: `No questions found for category: ${category}`,
          success: false,
        });
      }

      return res.status(200).json({
        message: `Questions fetched for category: ${category}`,
        success: true,
        totalQuestions: questions.length,
        data: questions,
      });
    } catch (error: any) {
      console.error("Get questions error:", error);
      return res.status(500).json({
        message: "Failed to fetch questions by category",
        success: false,
        error: error.message,
      });
    }
  }
  async getQuestionsForExam(req: Request, res: Response) {
    console.log("question get hit");

    const { categories } = req.query;

    try {
      if (!categories) {
        return res.status(400).json({
          success: false,
          message: "Categories are required",
        });
      }

      const categoryList = String(categories)
        .split(",")
        .map((c) => c.trim().toLowerCase());

      if (categoryList.length !== 4) {
        return res.status(400).json({
          success: false,
          message: "Exactly 4 categories must be selected",
        });
      }

      const QUESTIONS_PER_CATEGORY = 25;
      let allQuestions: any[] = [];

      // 🔥 25 random question per category
      for (const category of categoryList) {
        const questions = await Question.aggregate([
          {
            $match: {
              isActive: true,
              category: { $regex: new RegExp(`^${category}$`, "i") },
            },
          },
          { $sample: { size: QUESTIONS_PER_CATEGORY } },
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

        allQuestions.push(...questions);
      }

      // 🔀 Final shuffle
      allQuestions.sort(() => Math.random() - 0.5);

      return res.status(200).json({
        success: true,
        message: "Questions fetched successfully",
        total: allQuestions.length, // should be 100
        categories: categoryList,
        questions: allQuestions.map((q) => ({
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
        success: false,
        message: "Failed to fetch questions",
        error: error.message,
      });
    }
  }

}
