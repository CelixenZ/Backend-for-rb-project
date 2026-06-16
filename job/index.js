const { createNotificationJob } = require("./notificationJob");

const jobs = new Map();

/**
 * @param {import("socket.io").Socket} io
 */
function registerJobs(io) {
    const notificationJob = createNotificationJob(io);
    jobs.set("notification", notificationJob);
}

function startAllJobs() {
    jobs.forEach((job, name) => {
        job.start();
        console.log(`Started job: ${name}`);
    });
}

function stopAllJobs() {
    jobs.forEach((job, name) => {
        job.stop();
        console.log(`Stopped job: ${name}`);
    });
}

module.exports = {
    registerJobs: registerJobs,
    startAllJobs: startAllJobs,
    stopAllJobs: stopAllJobs
}