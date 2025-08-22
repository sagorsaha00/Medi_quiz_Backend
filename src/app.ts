import express from "express";
import userRouter from "./router/userRouter";
import quizRouter from "./router/quizRouter";
import cookieParser from "cookie-parser";
import { QuizController } from "./quizController/quizController";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/auth", userRouter);
app.use("/quiz", quizRouter);

export default app;
