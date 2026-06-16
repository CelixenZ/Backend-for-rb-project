const { socketProtected } = require("./authMiddleware");

/**
 * @param {import("socket.io").Server} io 
 */
function initSocketServer(io) {
    io.use(socketProtected);

    io.on("connection", (socket) => {
        socket.on("register", (userId) => {
            socket.userId = String(userId);
            socket.join(userId);

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

module.exports = {
    initSocketServer
}