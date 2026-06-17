import path from "path";

import dotenv from "dotenv";

import { Server } from "socket.io";
import http from "http";

import { initSocketServer } from "./websocket";
import { createApp } from "./app";

dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

const app = createApp();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  },
});

initSocketServer(io);

// jobs.registerJobs(io);
// jobs.startAllJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is spinning up on port ${PORT}`);
});

