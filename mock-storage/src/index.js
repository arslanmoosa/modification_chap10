const express = require("express");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

const PORT = process.env.PORT;
const storagePath = path.join(__dirname, "../storage");
console.log(`Storing files at ${storagePath}.`);

// Ensure the storage directory exists
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
}

const app = express();

//
// HTTP GET route that streams a video from storage.
//
app.get("/video", (req, res) => {
    const videoId = req.query.id;
    const localFilePath = path.join(storagePath, videoId);
    res.sendFile(localFilePath);
});

//
// HTTP POST route to upload a video to storage and overlay text on the video.
//
app.post("/upload", (req, res) => {
    const videoId = req.headers.id; // Get video ID from request headers

    if (!videoId) {
        console.error("Missing video ID in request headers.");
        return res.status(400).send("Missing video ID.");
    }

    const localFilePath = path.join(storagePath, videoId); // Define local file path for storing video
    const fileWriteStream = fs.createWriteStream(localFilePath); // Create writable stream for video file

    req.pipe(fileWriteStream) // Pipe incoming request stream to writable stream
        .on("error", err => {
            console.error("Upload failed.");
            console.error(err && err.stack || err);
            res.status(500).send("Upload failed: " + err.message); // Send error message in response
        })
        .on("finish", () => {
            console.log("Upload finished successfully.");
            overlayTextOnVideo(localFilePath, videoId, res); // Call function to overlay text
        });
});

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

app.listen(PORT, () => {
    console.log(`Microservice online`);
});
