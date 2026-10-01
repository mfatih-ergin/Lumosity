import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import workoutRoutes from './routes/workoutRoutes';
import { setupDuelSocketHub } from './sockets/duelHub';

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Socket.io Server Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workouts', workoutRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Real-time Duel Hub
setupDuelSocketHub(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🧠 NeuroCraft Server running on http://localhost:${PORT}`);
});
