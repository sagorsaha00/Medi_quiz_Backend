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

router.get("/GetResultHistory", (req, res) =>
  quizController.getUserHistory(req, res)
);
router.get("/categories", (req, res) =>
  quizController.getAvailableCategories(req, res)
);

router.get("/getRandomQuestion", (req, res) =>
  quizController.getRandomQuestion(req, res)
);
router.post("/submitRandomQuiz", (req, res) => {
  quizController.submitPracticeAnswer(req, res);
});

router.get("/allQuestion", (req, res) => {
  quizController.getAllQuestion(req, res);
});
router.get("/QuestionByCategory", (req, res) => {
  quizController.getQuestionsByCategory(req, res);
});
export default router;
