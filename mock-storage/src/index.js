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
// HTTP POST route to upload a video to storage and generate thumbnails.
//
app.post("/upload", (req, res) => {
    const videoId = req.headers.id; // Get video ID from request headers
    const localFilePath = path.join(storagePath, videoId); // Define local file path for storing video
    const fileWriteStream = fs.createWriteStream(localFilePath); // Create writable stream for video file

    req.pipe(fileWriteStream) // Pipe incoming request stream to writable stream
        .on("error", err => {
            console.error("Upload failed.");
            console.error(err && err.stack || err);
            res.status(500).send("Upload failed: " + err.message); // Send error message in response
        })
        .on("finish", async () => {
            try {
                await generateThumbnails(localFilePath, videoId); // Generate thumbnails after upload completes
                res.sendStatus(200);
            } catch (error) {
                console.error("Error generating thumbnails: ", error);
                res.status(500).send("Error generating thumbnails: " + error.message); // Send error message in response
            }
        });
});

// Function to generate thumbnails for all frames of the video with overlay text
async function generateThumbnails(videoPath, videoId) {
    const thumbnailDir = path.join(storagePath, "thumbnails", videoId); // Path to store thumbnails
    fs.mkdirSync(thumbnailDir, { recursive: true }); // Create thumbnail directory if it doesn't exist

    const thumbnailText = "Harry Here"; // Text to overlay on thumbnails

    return new Promise((resolve, reject) => {
        console.log(`Generating thumbnails for video: ${videoPath}`);
        ffmpeg(videoPath)
            .on("end", () => {
                console.log("Thumbnails generated successfully.");
                resolve();
            })
            .on("error", err => {
                console.error("Error generating thumbnails: ", err);
                reject(err);
            })
            .outputOptions([
                '-vf', `fps=1,drawtext=text='${thumbnailText}':fontcolor=white:fontsize=24:x=10:y=10`, // Overlay text
                `-q:v 2` // Set quality of thumbnails
            ])
            .save(path.join(thumbnailDir, `${videoId}-%03d.png`)); // Save thumbnails
    });
}

app.listen(PORT, () => {
    console.log(`Microservice online`);
});
