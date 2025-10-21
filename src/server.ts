import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server, Socket } from "socket.io";
import app from "./app";
import { initDb } from "../src/database/initiDb";
import cors from "cors";

const port = process.env.PORT || 3000;
// ---- CORS ----
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// ---- HTTP + Socket Server ----
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

server.listen(port, () => {
  initDb();
  console.log(`🚀 Server running on port ${port}`);
});
