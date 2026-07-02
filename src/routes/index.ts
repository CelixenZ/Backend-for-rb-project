import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import activityRouter from "../modules/activity/activity.routes"
import contractRouter from "../modules/contract/contract.routes"
import notificationRouter from "../modules/notification/notification.routes"
import customerRouter from "../modules/customer/customer.routes";
import dashboardRouter from "../modules/dashboard/dashboard.routes";
import serviceRouter from "../modules/service/service.routes";
import settingsRouter from "../modules/settings/settings.routes";
import supplierRouter from "../modules/supplier/supplier.routes";
import usersRouter from "../modules/users/users.routes";
import reportRouter from "../modules/report/report.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/activities", activityRouter);
router.use("/contracts", contractRouter);
router.use("/alert", notificationRouter);
router.use("/customers", customerRouter);
router.use("/dashboard", dashboardRouter);
router.use("/services", serviceRouter);
router.use("/settings", settingsRouter);
router.use("/suppliers", supplierRouter);
router.use("/users", usersRouter);
router.use("/reports", reportRouter);

export default router;