import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server, Socket } from "socket.io";
import app from "./app";
import { initDb } from "../src/database/initiDb";
import cors from "cors";

interface User {
  username: string;
  room: string;
}

interface JoinRoomData {
  username: string;
  room: string;
}

interface MessageData {
  username: string;
  room: string;
  message: string;
}

interface StoredMessage {
  user: string;
  text: string;
  time: Date;
}

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

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// ---- Active Users ----
const users: Record<string, User> = {};

// ---- Room Messages Storage ----
const roomMessages: Record<string, StoredMessage[]> = {};

// ---- Helper Function: Save Message ----
const saveMessage = (room: string, message: StoredMessage) => {
  if (!roomMessages[room]) {
    roomMessages[room] = [];
  }
  roomMessages[room].push(message);
  
  // Keep only last 100 messages per room
  if (roomMessages[room].length > 100) {
    roomMessages[room] = roomMessages[room].slice(-100);
  }
};

// ---- Socket Events ----
io.on("connection", (socket: Socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // 🔹 User joins a room
  socket.on("joinRoom", (data: JoinRoomData) => {
    const { username, room } = data;
    users[socket.id] = { username, room };
    socket.join(room);

    console.log(`👤 ${username} joined room: ${room}`);

    // Send previous messages to the new user
    if (roomMessages[room] && roomMessages[room].length > 0) {
      socket.emit("previousMessages", roomMessages[room]);
      console.log(`📤 Sent ${roomMessages[room].length} messages to ${username}`);
    }

    // ✅ Notify others that user joined
    const joinMsg: StoredMessage = {
      user: "system",
      text: `${username} joined the group`,
      time: new Date(),
    };
    
    socket.to(room).emit("message", joinMsg);
    saveMessage(room, joinMsg);
    
    console.log(`✅ ${username} join notification sent to ${room}`);
  });

  // 🔹 Handle incoming messages
  socket.on("sendMessage", (data: MessageData) => {
    const { username, room, message } = data;
    
    const msgPayload: StoredMessage = {
      user: username,
      text: message,
      time: new Date(),
    };

    // Save and broadcast message
    saveMessage(room, msgPayload);
    io.to(room).emit("message", msgPayload);
    
    console.log(`💬 [${room}] ${username}: ${message}`);
  });
 

 
  socket.on("disconnect", () => {
    const user = users[socket.id];
    
    if (user) {
      console.log(`❌ ${user.username} disconnected from ${user.room}`);
      delete users[socket.id];
 
    } else {
      console.log(`❌ Unknown user disconnected: ${socket.id}`);
    }
  });
});

 
server.listen(3000, () => {
  initDb();
  console.log("🚀 Server running on port 3000");
  console.log("📡 Socket.IO ready");
  console.log("💬 Group chat enabled (no leave notifications)");
});