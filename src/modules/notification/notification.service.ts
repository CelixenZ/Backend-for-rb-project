import { ContractAlertLogStatus, NotificationChannel } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../shared/utils/apiError";
import { convertToKhTime } from "../../shared/utils/timezoneUtil";
import * as contractAlertRepo from "./contractAlert.repo";
import * as mailSender from "../../shared/utils/mailSender";
import { isUserOnline } from "../../websocket/util";

const createAlert = async ({ contractId, userId, dayBeforeExpiry }) => {
  if (dayBeforeExpiry < 1) {
    throw new ApiError(400, "Day before expired can't be less than 1");
  }

  const existingContract = await prisma.contract.findFirst({
    where: { id: contractId },
  });

  if (existingContract) {
    const now = new Date();
    const currentDateUTC = new Date(now.toISOString());
    const expiredDateUTC = new Date(existingContract.endDate.toISOString());

    // reset hours to 0 for accurate day comparation
    currentDateUTC.setHours(0, 0, 0, 0);
    expiredDateUTC.setHours(0, 0, 0, 0);

    // check if contract expired
    if (currentDateUTC > expiredDateUTC) {
      throw new ApiError(400, "Contract already expired");
    } else if (currentDateUTC.getTime() == expiredDateUTC.getTime()) {
      throw new ApiError(400, "Contract is expired today");
    }

    const daysDifferent =
      (expiredDateUTC.getTime() - currentDateUTC.getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDifferent < dayBeforeExpiry) {
      throw new ApiError(
        400,
        "Contract will be expired before reminding alert",
      );
    }

    const existingAlert = await prisma.contractExpiryAlert.findFirst({
      where: {
        AND: [
          { contractId: contractId },
          { userId: userId },
          { dayBeforeExpiry: dayBeforeExpiry },
        ],
      },
    });

    if (existingAlert) {
      throw new ApiError(409, "This alert already configured");
    }

    const created = await prisma.contractExpiryAlert.create({
      data: {
        user: {
          connect: { id: userId },
        },
        contract: {
          connect: { id: contractId },
        },
        dayBeforeExpiry: dayBeforeExpiry,
      },
    });

    const alertDateTimestamp =
      expiredDateUTC.getTime() - dayBeforeExpiry * 1000 * 60 * 60 * 24;
    const alertDateUTC = new Date(alertDateTimestamp);
    const alertDateKhTimezone = convertToKhTime(alertDateUTC);

    return {
      expiredDateKhTime: convertToKhTime(existingContract.endDate),
      alertDateKhTime: alertDateKhTimezone,
    };
  }

  throw new ApiError(404, "Contract not found");
};

const createManyAlert = async ({ contractId, userId, daysBeforeExpiry }) => {
  if (!contractId) throw new ApiError(404, "Contract not found");

  const existingContract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!existingContract) throw new ApiError(404, "Contract not found");

  if (daysBeforeExpiry.length === 0) return;

  if (daysBeforeExpiry.includes(0))
    throw new ApiError(400, "DaysBeforeExpiry can not be 0");

  const s = new Set(daysBeforeExpiry);
  if (s.size !== daysBeforeExpiry.length)
    throw new ApiError(400, "DaysBeforeExpiry can not contain duplicate value");

  const now = new Date();
  const currentDateUTC = new Date(now.toISOString());
  const expiredDateUTC = new Date(existingContract.endDate.toISOString());

  // reset hours to 0 for accurate day comparation
  currentDateUTC.setHours(0, 0, 0, 0);
  expiredDateUTC.setHours(0, 0, 0, 0);

  // check if contract expired
  if (currentDateUTC > expiredDateUTC) {
    throw new ApiError(400, "Contract already expired");
  } else if (currentDateUTC.getTime() == expiredDateUTC.getTime()) {
    throw new ApiError(400, "Contract is expired today");
  }

  const condition = [];

  const daysDifferent =
    (expiredDateUTC.getTime() - currentDateUTC.getTime()) /
    (1000 * 60 * 60 * 24);
  for (const i of daysBeforeExpiry) {
    if (daysDifferent < i) {
      throw new ApiError(
        400,
        "One or more Contract will be expired before reminding alert",
      );
    }
    condition.push({
      contractId: contractId,
      userId: userId,
      dayBeforeExpiry: i,
    });
  }

  const existingAlert = await prisma.contractExpiryAlert.findFirst({
    where: {
      OR: condition,
    },
  });

  if (existingAlert) {
    throw new ApiError(409, "One or more alert already configured");
  }

  await prisma.contractExpiryAlert.createMany({
    data: condition,
  });
};

const editManyAlerts = async ({ userId, contractId, daysBeforeExpiry }) => {
  const s = new Set(daysBeforeExpiry);
  if (s.size !== daysBeforeExpiry.length)
    throw new ApiError(400, "DaysBeforeExpiry can not contain duplicate value");

  const alerts = await contractAlertRepo.getAllAlertByContractIdForUser(
    userId,
    contractId,
  );

  const newAlerts = daysBeforeExpiry
    .filter((i) => !alerts.some((j) => j.dayBeforeExpiry == i))
    .map((i) => ({ contractId, userId, dayBeforeExpiry: i }));
  const deletedAlertsId = alerts
    .filter((i) => !daysBeforeExpiry.includes(i.dayBeforeExpiry))
    .map((i) => i.id);

  await prisma.$transaction(async (tx) => {
    if (newAlerts.length > 0) {
      await tx.contractExpiryAlert.createMany({
        data: newAlerts,
      });
    }

    if (deletedAlertsId.length > 0) {
      await tx.contractExpiryAlert.deleteMany({
        where: {
          AND: [{ id: { in: deletedAlertsId } }, { isActive: true }],
        },
      });
    }
  });
};

/**
 * @param {import("socket.io").Socket} io
 */
const notifyUsers = async (io) => {
  const activeAlert = await contractAlertRepo.getAllActiveAlertContract();
  const completedAlert = [];

  const now = new Date();
  const nowUTC = new Date(now.toISOString());
  nowUTC.setHours(0, 0, 0, 0);

  for (const i of activeAlert) {
    const daysDifferent = Math.floor(
      (i.contract.endDate.getTime() - nowUTC.getTime()) / (1000 * 60 * 60 * 24),
    );

    // if alert today
    if (daysDifferent == i.dayBeforeExpiry) {
      const sentEmail = await notifyUserByEmail({
        contractId: i.contractId,
        email: i.user.email,
        contractTitle: i.contract.title,
        daysBeforeExpiry: i.dayBeforeExpiry,
        endDate: i.contract.endDate,
      });

      const pushed = await notifyUserByPush({
        contractId: i.contractId,
        userId: i.userId,
        contractTitle: i.contract.title,
        daysBeforeExpiry: i.dayBeforeExpiry,
        endDate: i.contract.endDate,
        io: io,
      });

      const alertDateTimestamp =
        i.contract.endDate.getTime() - i.dayBeforeExpiry * 1000 * 60 * 60 * 24;
      const alertDateUTC = new Date(alertDateTimestamp);

      completedAlert.push({
        ceaId: i.id,
        notificationChannel: NotificationChannel.EMAIL,
        alertDate: alertDateUTC,
        status: sentEmail
          ? ContractAlertLogStatus.SENT
          : ContractAlertLogStatus.FAILED,
      });

      completedAlert.push({
        ceaId: i.id,
        notificationChannel: NotificationChannel.PUSH,
        alertDate: alertDateUTC,
        status: pushed
          ? ContractAlertLogStatus.SENT
          : ContractAlertLogStatus.FAILED,
      });
    }
  }

  if (completedAlert.length > 0) {
    await contractAlertRepo.createAlertLogs(completedAlert);
    await contractAlertRepo.disableAlertsByIDs(
      completedAlert.map((i) => i.ceaId),
    );
  }
};

const notifyUserByEmail = async ({
  email,
  contractId,
  contractTitle,
  daysBeforeExpiry,
  endDate,
}) => {
  try {
    await mailSender.sendMail({
      to: email,
      body: `Contract: ${contractTitle} will be expired in the next: ${daysBeforeExpiry}. Expired date: ${convertToKhTime(endDate)}`,
      subject: "Contract Expiration Alert",
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const notifyUserByPush = async ({
  io,
  userId,
  contractId,
  contractTitle,
  daysBeforeExpiry,
  endDate,
}) => {
  try {
    if (isUserOnline(io, userId)) {
      io.to(String(userId)).emit("remider-alert", {
        contractTitle,
        daysBeforeExpiry,
        contractId,
        endDate,
      });
    }
    return true;
  } catch (error) {
    return false;
  }
};

const countUnreadNotificationsForUser = async (userId) => {
  const total = await prisma.contractAlertLog.count({
    where: {
      AND: [
        { contractExpiryAlert: { userId: userId } },
        { notificationChannel: "PUSH" },
        { status: "SENT" },
      ],
    },
  });

  return total;
};

const getAllPushedNofiticationsForUser = async (userId) => {
  const notifications = await prisma.contractAlertLog.findMany({
    select: {
      sentAt: true,
      status: true,
      id: true,
      contractExpiryAlert: {
        select: {
          contract: {
            select: { id: true, title: true, endDate: true },
          },
          dayBeforeExpiry: true,
          contractId: true,
        },
      },
    },
    where: {
      AND: [
        { contractExpiryAlert: { userId: parseInt(userId) } },
        { notificationChannel: "PUSH" },
      ],
    },
    orderBy: [
      {
        contractExpiryAlert: { dayBeforeExpiry: "asc" },
      },
      { status: "desc" },
    ],
  });

  return notifications;
};

export async function markNotificationAs(req: { ceaId: number; userId: number; status: "READ" | "SENT" }) {
  const existingLog = await prisma.contractAlertLog.findFirst({
    select: {
      ceaId: true
    },
    where: {
      AND: [
        { id: req.ceaId },
        { contractExpiryAlert: { userId: req.userId } },
        { notificationChannel: "PUSH" }
      ],
    },
  });

  if (!existingLog) return;

  await prisma.contractAlertLog.update({
    data: {
      status: req.status,
    },
    where: {
      id: req.ceaId
    }
  });
}

export {
  createAlert,
  notifyUsers,
  createManyAlert,
  editManyAlerts,
  countUnreadNotificationsForUser,
  getAllPushedNofiticationsForUser,
};
