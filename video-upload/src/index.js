const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib');
const axios = require("axios");

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const PORT = process.env.PORT;
const RABBIT = process.env.RABBIT;

//
// Application entry point.
//
async function main() {

    const messagingConnection = await amqp.connect(RABBIT); // Connects to the RabbitMQ server.

    const messageChannel = await messagingConnection.createChannel(); // Creates a RabbitMQ messaging channel.

    const app = express();

    //
    // Broadcasts the "video-uploaded" message.
    //
    function broadcastVideoUploadedMessage(videoMetadata) {
        console.log(`Publishing message on "video-uploaded" exchange.`);
            
        const msg = { video: videoMetadata };
        const jsonMsg = JSON.stringify(msg);
        messageChannel.publish("video-uploaded", "", Buffer.from(jsonMsg)); // Publishes the message to the "video-uploaded" exchange.
    }

    //
    // Route for uploading videos.
    //
    app.post("/upload", async (req, res) => {

        const fileName = req.headers["file-name"];
        const videoId = new mongodb.ObjectId(); // Creates a new unique ID for the video.
        const response = await axios({ // Forwards the request to the video-storate microservice.
            method: "POST",
            url: "http://video-storage/upload", 
            data: req, 
            responseType: "stream",
            headers: {
                "content-type": req.headers["content-type"],
                "id": videoId,
            },
        });
        response.data.pipe(res);

        // Broadcasts the message to other microservices.
        broadcastVideoUploadedMessage({ id: videoId, name: fileName });
    });

    // Other handlers go here.

    app.listen(PORT, () => { // Starts the HTTP server.
        console.log("Microservice online.");
    });
}
// Function to overlay text on the video
function overlayTextOnVideo(videoPath, videoId, res) {
    const outputVideoPath = path.join(storagePath, `output_${videoId}`); // Define output video path
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
main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });