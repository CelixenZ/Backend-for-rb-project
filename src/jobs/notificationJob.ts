import * as cron from "node-cron";
import * as notificationService from "../modules/notification/notification.service";
import { CRON_SCHEDULES, TIME_ZONE } from "../config/cron.config";
import { getIO } from "../websocket";
import { SOCKET_EVENT } from "../websocket/constants/socketEvent";

export function createNotificationJob() {
  return cron.schedule(
    CRON_SCHEDULES.EVERY_DAY_8AM,
    async () => {
      await notificationService.notifyUsers();
    },
    {
      timezone: TIME_ZONE,
    },
  );
}

export function simulateNotificationJob() {
  return cron.schedule(CRON_SCHEDULES.EVERY_5_SECONDS, 
    async () => {
      await notificationService.notifyUserByPush({
        userId: 10,
        contractId: 8,
        contractTitle: "IT Support",
        daysBeforeExpiry: 90,
        endDate: "2026-07-17T17"
      });
    },
    {
      timezone: TIME_ZONE,
    },
  )
}