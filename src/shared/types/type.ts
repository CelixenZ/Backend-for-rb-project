import { Socket } from "socket.io";

export interface MySocket extends Socket {
    userId: string;
    userRole: string;
    userStatus: boolean;
}