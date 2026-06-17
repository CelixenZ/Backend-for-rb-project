import { Router, Response } from "express";
import { protect } from "../../middleware/auth.middleware";
import * as notificationService from "./notification.service";
import ApiError from "../../shared/utils/apiError";
import { getAllAlertByContractIdForUser } from "./contractAlert.repo";
import { zodValidateMiddleware } from "../../middleware/validate.middleware";
import { markNotificationAsSchema } from "./notification.schema";

const router = Router();

router.post("/", protect, async (req: any, res) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }

    const { contractId, dayBeforeExpiry } = req.body;

    try {
        const result = await notificationService.createAlert({
            contractId: parseInt(contractId),
            userId: req.user.id,
            dayBeforeExpiry: parseInt(dayBeforeExpiry)
        });

        return res.status(201).json({
            expiredDate: result.expiredDateKhTime,
            alertDate: result.alertDateKhTime
        });
    } catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error.message);
        }
        throw error;
    }
});

router.post("/create-many", protect, async (req: any, res) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }

    const { contractId, daysBeforeExpiry } = req.body;
    try {
        await notificationService.createManyAlert({ 
            contractId: parseInt(contractId), 
            userId: req.user.id, 
            daysBeforeExpiry 
        });
        return res.status(201).json("Created alerted successfully");
    } catch (error) {
        if (error instanceof ApiError) {
            console.error(error.message)
            return res.status(error.statusCode).json(error.message);
        }
        throw error;
    }
});

router.get("/id/:contractId", protect, async (req: any, res) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }
    
    const { contractId } = req.params;
    if (!Number.isInteger(parseInt(contractId))) {
        return res.status(404).json("Contract not found"); 
    }

    const result = await getAllAlertByContractIdForUser(req.user.id, contractId);
    return res.status(200).json(result);
});

router.put("/edit/:contractId", protect, async (req: any, res) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }

    const { contractId } = req.params;
    const { daysBeforeExpiry } = req.body;

    const r = await notificationService.editManyAlerts({
        userId: req.user.id,
        contractId: parseInt(contractId),
        daysBeforeExpiry: daysBeforeExpiry
    });

    return res.status(200).json("Success updated alert");
});

router.get("/count-unread", protect, async (req: any, res) =>{
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }

    const totalNotification = await notificationService.countUnreadNotificationsForUser(req.user.id);
    return res.status(200).json({
        total: totalNotification
    });
});

router.get("/push", protect, async (req: any, res) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json("Access Denied");
    }

    const notifications = await notificationService.getAllPushedNofiticationsForUser(req.user.id);
    return res.status(200).json(notifications);
});

router.put("/mark-as", protect, zodValidateMiddleware(markNotificationAsSchema),  async (req: any, res: Response) => {
    if (req.user.role && req.user.role !== "ADMIN") {
        return res.status(403).json({
            error: "Access Denied"
        });
    }

    const userId: number = parseInt(req.user.id);
    const ceaId: number = parseInt(req.query.ceaId);
    const status: "READ" | "SENT" = req.query.status;

    await notificationService.markNotificationAs({
        ceaId, userId, status
    });

    return res.status(200).json({
        message: "Successfully marked notification"
    });
})

export default router;