const cron = require("node-cron");
const { CRON_SCHEDULES, TIME_ZONE } = require("../config/cronConfig");
const notificationService = require("../service/notificationService");

/**
 * @param {import("socket.io").Socket} io
 */
function createNotificationJob(io) {
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
module.exports = { createNotificationJob: createNotificationJob };
