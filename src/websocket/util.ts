import { Server } from "socket.io";

export function isUserOnline(io: Server, userId) {
    const room = io.sockets.adapter.rooms.get(String(userId));
    return room ? room.size > 0 : false;
}
