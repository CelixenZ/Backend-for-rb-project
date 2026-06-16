import { Socket } from "socket.io";

const cron = require("node-cron");
const { CRON_SCHEDULES, TIME_ZONE } = require("../../config/cronConfig");
const notificationService = require("../../service/notificationService");

export function createNotificationJob(io: Socket) {
  return cron.schedule(
    CRON_SCHEDULES.EVERY_DAY_8AM,
    async () => {
      await notificationService.notifyUsers(io);
    },
    {
      schedule: false,
      timezone: TIME_ZONE,
    },
  );
}

