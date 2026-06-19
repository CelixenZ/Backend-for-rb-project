import { Server } from "socket.io";

export function isUserOnline(io: Server, userId) {
    const room = io.sockets.adapter.rooms.get(userId);
    return room ? room.size > 0 : false;
}
