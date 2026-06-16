import prisma from "../config/prisma";
import jwt from "jsonwebtoken";

const socketProtected = async (socket: any, next) => {
    const token = socket.handshake.auth.token || undefined;
    if (!token) return next(new Error("Authorization Error"));
    
    try {
        const decoded: any = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
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

export default { socketProtected }