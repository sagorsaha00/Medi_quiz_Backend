import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
});

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    avatar: String,
  },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, default: "text" }, // text, image, file
});
const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);
export { User, Message };
