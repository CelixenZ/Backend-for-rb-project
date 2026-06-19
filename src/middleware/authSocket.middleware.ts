import prisma from "../config/prisma";
import jwt from "jsonwebtoken";
import { MySocket } from "../shared/types/type";
import { env } from "../config/env.config";

export const socketProtected = async (socket: MySocket, next) => {
    const token = socket.handshake.auth.token || undefined;
    if (!token) return next(new Error("Authorization Error"));
    
    try {
        const decoded: any = await new Promise((resolve, reject) => {
            jwt.verify(token, env.JWT_ACCESS_SECRET, (err, decode) => {
                if (err) reject(err);
                else resolve(decode);
            });
        });

        const user = await prisma.user.findUnique({
            select: {
                id: true,
                role: true,
                status: true
            },
            where: {
                id: parseInt(decoded.id)
            }
        });

        if (!user) return next(new Error("Authorization Error"));

        socket.userId = decoded.id;
        socket.userRole = user.role.toString();
        socket.userStatus = user.status;
        next();
    } catch (error) {
        return next(new Error("Authorization Error"));
    }
}