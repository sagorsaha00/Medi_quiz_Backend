import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server, Socket } from "socket.io";
import app from "./app";
import { initDb } from "../src/database/initiDb";
import cors from "cors";

// const port = process.env.PORT || 3000;
const port = 3000 ;
 
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
app.get("/", (req, res) => {
  res.send("✅ Medi Quiz Backend API is running successfully!");
});

server.listen(port, () => {
  initDb();
  console.log(`🚀 Server running on port ${port}`);
});
