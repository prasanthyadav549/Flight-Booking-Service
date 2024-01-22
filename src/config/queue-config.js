const amqplib = require("amqplib");

let channel, connection;

async function connectQueue() {
  try {
    connection = await amqplib.connect("amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue("noti-queue");
  } catch (error) {
    console.log("queue connection error:", error);
    throw error;
  }
}

async function sendData(data) {
  try {
    await channel.sendToQueue("noti-queue", Buffer.from(JSON.stringify(data)));
  } catch (error) {
    console.log("send data error:", error);
    throw error;
  }
}

module.exports = {
  connectQueue,
  sendData,
};
