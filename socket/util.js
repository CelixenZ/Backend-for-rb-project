function isUserOnline(io, userId) {
    const room = io.sockets.adapter.rooms.get(String(userId));
    return room ? room.length > 0 : false;
}

/**
 * @param {import("socket.io").Socket} socket 
 */
function isUserAdmin(socket) {
    return socket.userRole === "ADMIN";
}

module.exports = {
    isUserOnline: isUserOnline
}