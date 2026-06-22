import * as cron from "node-cron";
import * as notificationService from "../modules/notification/service/notification.service";
import { CRON_SCHEDULES, TIME_ZONE } from "../config/cron.config";
import { env } from "../config/env.config";

export function createNotificationJob() {
  return cron.schedule(
    env.NODE_ENV === "dev"
      ? CRON_SCHEDULES.EVERY_8_SECONDS
      : CRON_SCHEDULES.EVERY_DAY_8AM,
    async () => {
      await notificationService.notifyUsers();
    },
    {
      timezone: TIME_ZONE,
    },
  );
}

export function simulateNotificationJob() {
  return cron.schedule(
    CRON_SCHEDULES.EVERY_8_SECONDS,
    async () => {
      await notificationService.notifyUserByPush({
        userId: 10,
        contractId: 8,
        contractTitle: "IT Support",
        daysBeforeExpiry: 90,
        endDate: "2026-07-17T17",
      });
    },
    {
      timezone: TIME_ZONE,
    },
  );
}
