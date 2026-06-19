import { Server as SocketServer } from "socket.io";
import { socketProtected } from "../middleware/authSocket.middleware";
import { Server as HttpServer } from "http";
import { env } from "../config/env.config";
import { MySocket } from "../shared/types/type";

let io: SocketServer;

export function initSocketServer(server: HttpServer) {

    io = new SocketServer(server, {
        cors: {
            origin: env.CLIENT_URL || "http://localhost:3000",
            credentials: true
        }
    });

    io.use(socketProtected);

    io.on("connection", (socket: MySocket) => {
        socket.on("register", () => {
            socket.join(socket.userId);

            console.log(`Socket ${socket.id} joined room ${socket.userId}`)
        });

        socket.on("disconnect", () => {
            console.log(`Socket: ${socket.id} disconnected from room: ${socket.userId}`)
        });

        socket.on("logout", () => {
            socket.leave(socket.userId);
            socket.disconnect(true);
        });
    });
}

export function getIO() {
    if (!io) throw new Error("IO not initialized");
    return io;
}