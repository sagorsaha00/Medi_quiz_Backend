import { User } from "../database/webSocketSchema";
import { io } from "../server"
import { Message } from "../database/webSocketSchema";
const onlineUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('নতুন user connected:', socket.id);

  // User যখন chat এ join করে
  socket.on('userJoin', async (userData) => {
    try {
      const { userId, userName, userAvatar } = userData;
      
      // User কে online করুন
      await User.findByIdAndUpdate(userId, { 
        isOnline: true 
      });
      
      // Memory তে user info রাখুন
      onlineUsers.set(socket.id, {
        userId,
        userName,
        userAvatar: userAvatar || ''
      });
      
      // সবাইকে জানান নতুন user এসেছে
      socket.broadcast.emit('userOnline', {
        userId,
        userName,
        message: `${userName} joined the chat`
      });
      
      // Current online users list পাঠান
      const allOnlineUsers = Array.from(onlineUsers.values());
      io.emit('onlineUsersList', allOnlineUsers);
      
      console.log(`${userName} joined the chat`);
      
    } catch (error) {
      console.error('User join error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // নতুন message পাঠানো
  socket.on('sendMessage', async (messageData) => {
    try {
      const { content, senderId, senderName, senderAvatar } = messageData;
      
      // Database এ message save করুন
      const newMessage = new Message({
        content,
        sender: {
          userId: senderId,
          name: senderName,
          avatar: senderAvatar || ''
        },
        timestamp: new Date(),
        messageType: 'text'
      });
      
      await newMessage.save();
      
      // সব connected users এ message পাঠান
      io.emit('newMessage', {
        _id: newMessage._id,
        content: newMessage.content,
        sender: newMessage.sender,
        timestamp: newMessage.timestamp,
        messageType: newMessage.messageType
      });
      
      console.log(`Message from ${senderName}: ${content}`);
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // User typing indicator
  socket.on('typing', (typingData) => {
    const { userName, isTyping } = typingData;
    
    // অন্য সবাইকে জানান user typing করছে
    socket.broadcast.emit('userTyping', {
      userName,
      isTyping
    });
  });
  socket.on('connect', async () => {

  })

  // User disconnect হলে
  socket.on('disconnect', async () => {
    try {
      const userData = onlineUsers.get(socket.id);
      
      if (userData) {
        const { userId, userName } = userData;
        
        // Database এ user কে offline করুন
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Memory থেকে user remove করুন
        onlineUsers.delete(socket.id);
        
        // সবাইকে জানান user চলে গেছে
        socket.broadcast.emit('userOffline', {
          userId,
          userName,
          message: `${userName} left the chat`
        });
        
        // Updated online users list পাঠান
        const allOnlineUsers = Array.from(onlineUsers.values());
        io.emit('onlineUsersList', allOnlineUsers);
        
        console.log(`${userName} left the chat`);
      }
      
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});
