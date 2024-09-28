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

// Define the text for the thumbnail here
const thumbnailText = "Arslan Moosa";

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
    const videoId = req.headers.id;
    const localFilePath = path.join(storagePath, videoId);
    const fileWriteStream = fs.createWriteStream(localFilePath);
    
    req.pipe(fileWriteStream)
        .on("error", err => {
            console.error("Upload failed.");
            console.error(err && err.stack || err);
            res.sendStatus(500);
        })
        .on("finish", async () => {
            await generateThumbnails(localFilePath, videoId);
            res.sendStatus(200);
        });
});

// Function to generate thumbnails for every second of the video
async function generateThumbnails(videoPath, videoId) {
    const thumbnailDir = path.join(storagePath, "thumbnails", videoId);
    fs.mkdirSync(thumbnailDir, { recursive: true }); // Create thumbnail directory if it doesn't exist
    
    return new Promise((resolve, reject) => {
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
                '-vf', `fps=1,drawtext=text='${thumbnailText}':fontcolor=white:fontsize=24:x=10:y=10`, // Generate 1 frame per second and overlay text
                `-q:v 2` // Set the quality of the thumbnails (1-31, lower is better)
            ])
            .save(path.join(thumbnailDir, `${videoId}-%03d.png`)); // Save thumbnails with a pattern
    });
}

app.listen(PORT, () => {
    console.log(`Microservice online`);
});
