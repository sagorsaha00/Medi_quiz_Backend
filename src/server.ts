import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDb } from "./database/initiDb";
import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:8081",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.listen(3000, () => {
  initDb();
  console.log("Server is running on port 3000");
});
