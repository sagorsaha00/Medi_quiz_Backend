import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import app from "./app";
import { initDb } from "./database/initiDb";
import cors from "cors";
const server = http.createServer(app);
app.use(
  cors({
    origin: "http://localhost:8081",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);
export const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:8081", 
    methods: ["GET", "POST"]
  }
});
app.listen(3000, () => {
  initDb();
  console.log("Server is running on port 3000");
});
