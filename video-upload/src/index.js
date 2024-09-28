const express = require("express");
const mongodb = require("mongodb");
const amqp = require("amqplib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const PORT = process.env.PORT;
const RABBIT = process.env.RABBIT;
const storagePath = path.join(__dirname, "../storage"); // Path to store uploaded videos

async function main() {
    const messagingConnection = await amqp.connect(RABBIT);
    const messageChannel = await messagingConnection.createChannel();
    const app = express();

    function broadcastVideoUploadedMessage(videoMetadata) {
        console.log(`Publishing message on "video-uploaded" exchange.`);
        const msg = { video: videoMetadata };
        const jsonMsg = JSON.stringify(msg);
        messageChannel.publish("video-uploaded", "", Buffer.from(jsonMsg));
    }

    app.post("/upload", async (req, res) => {
        const fileName = req.headers["file-name"];
        const videoId = new mongodb.ObjectId(); // Creates a new unique ID for the video
        const localFilePath = path.join(storagePath, videoId.toString()); // Define local file path for storing video

        // Create a writable stream for the uploaded video
        const fileWriteStream = fs.createWriteStream(localFilePath);
        
        req.pipe(fileWriteStream) // Pipe incoming request stream to writable stream
            .on("error", (err) => {
                console.error("Upload failed.");
                console.error(err && err.stack || err);
                res.status(500).send("Upload failed: " + err.message);
            })
            .on("finish", async () => {
                console.log("Upload finished successfully.");

                // Overlay text on the uploaded video
                overlayTextOnVideo(localFilePath, videoId, res);

                // Broadcasts the message to other microservices
                broadcastVideoUploadedMessage({ id: videoId, name: fileName });
            });
    });

    // Function to overlay text on the video
    function overlayTextOnVideo(videoPath, videoId, res) {
        const outputVideoPath = path.join(storagePath, `output_${videoId}.mp4`); // Define output video path
        const overlayText = "Your Text Here"; // Text to overlay on the video

        console.log(`Overlaying text on video: ${videoPath}`);
        console.log(`Output video path: ${outputVideoPath}`);

        ffmpeg(videoPath)
            .outputOptions([
                `-vf`, `drawtext=text='${overlayText}':fontcolor=white:fontsize=24:x=10:y=10`, // Overlay text options
                '-c:a', 'copy' // Copy audio without re-encoding
            ])
            .save(outputVideoPath) // Save the output video
            .on('end', () => {
                console.log("Text overlay completed successfully.");
                res.sendStatus(200); // Send success response
            })
            .on('error', (err) => {
                console.error("Error overlaying text: ", err);
                res.status(500).send("Error overlaying text: " + err.message); // Send error message in response
            });
    }

    app.listen(PORT, () => {
        console.log("Microservice online.");
    });
}

main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });
