import { Socket } from "socket.io";
import { createNotificationJob } from "./notificationJob";

const jobs = new Map();

function registerJobs() {
  const notificationJob = createNotificationJob();
  jobs.set("notification", notificationJob);
}

function startAllJobs() {
  registerJobs();

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

export { startAllJobs, stopAllJobs };
