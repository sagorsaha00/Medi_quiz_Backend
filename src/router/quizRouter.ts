import express from "express";
import { QuizController } from "../quizController/quizController";
import { authMiddleware } from "../../midellware/authenticate";

const router = express.Router();

const quizController = new QuizController();

router.post("/createQuiz", (req, res) =>
  quizController.createQuestion(req, res)
);
router.get("/", (req, res) => quizController.getQuestionsForQuiz(req, res));
router.post("/submit", authMiddleware, (req, res) =>
  quizController.SubmitQuizAns(req, res)
);

router.get(
  "/GetResultHistory",
  authMiddleware,
  (req, res) => quizController.getUserHistory(req, res)
);

export default router;
