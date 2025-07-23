const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

const authRouter = require('./src/routes/auth');
app.use('/api/auth', authRouter);

const projectRouter = require('./src/routes/project.routes');
app.use('/api/projects', projectRouter);

// Socket.io real-time logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a project room
  socket.on('join-room', (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined room ${projectId}`);
  });

  // Broadcast drawing data to other users in the room
  socket.on('drawing', ({ projectId, data }) => {
    socket.to(projectId).emit('drawing', data);
  });

  // Broadcast cursor position to other users in the room
  socket.on('cursor', ({ projectId, cursor }) => {
    socket.to(projectId).emit('cursor', { sender: socket.id, cursor });
  });

  // Broadcast clear event to other users in the room
  socket.on('clear', ({ projectId }) => {
    socket.to(projectId).emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
    res.send('Hello from the backend!');
});
server.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
}); 