
import http from "http";
import { initSocketServer } from "./websocket";
import { createApp } from "./app";
import { env } from "./config/env.config";
import * as jobs from "./jobs/index";
import { simulateNotificationJob } from "./jobs/notificationJob";
import { notifyUserByEmail } from "./modules/notification/service/notification.service";

const app = createApp();
const server = http.createServer(app);

initSocketServer(server);

jobs.startAllJobs();
// simulateNotificationJob()

server.listen(env.PORT, () => {
  console.log(`🚀 Server is spinning up on port ${env.PORT}`);
});

