const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { Server } = require("socket.io");
const http = require("http");

// Import our auth routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const userRoutes = require('./routes/users');
const supplierRoutes = require('./routes/supplier');
const serviceRoutes = require('./routes/service');
const contractRoutes = require('./routes/contract');
const activityRoutes = require('./routes/activity');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const errorMiddleware = require('./middleware/errorMiddleware');
const contractAlert = require("./routes/contractAlert");
const jobs = require("./job/index");
const { initSocketServer } = require('./socket');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000'
    }
});

initSocketServer(io);

// Middleware
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// JSON parse error handler for malformed request bodies
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON payload:', err.message);
    return res.status(400).json({
      message: 'Invalid JSON payload. Please send valid JSON with Content-Type: application/json.',
    });
  }
  next(err);
});

// Route Mountpoints
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alert', contractAlert);

jobs.registerJobs(io);
jobs.startAllJobs();

// Base Test Route
app.get('/', (req, res) => {
  res.send('ICMS Backend API is running smoothly!');
});

// Centralized Error Handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is spinning up on port ${PORT}`);
});
