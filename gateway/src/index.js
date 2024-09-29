const express = require("express");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

const PORT = process.env.PORT;

//
// Application entry point.
//
async function main() {
    const app = express();

    app.set("views", path.join(__dirname, "views")); // Set directory that contains templates for views.
    app.set("view engine", "hbs"); // Use hbs as the view engine for Express.
    
    app.use(express.static("public"));

    //
    // Main web page that lists videos.
    //
    app.get("/", async (req, res) => {
        // Retrieves the list of videos from the metadata microservice.
        const videosResponse = await axios.get("http://metadata/videos");
        // Renders the video list for display in the browser.
        res.render("video-list", { videos: videosResponse.data.videos });
    });

    //
    // Web page to play a particular video.
    //
    app.get("/video", async (req, res) => {
        const videoId = req.query.id;
        // Retrieves the data from the metadata microservice.
        const videoResponse = await axios.get(`http://metadata/video?id=${videoId}`);
        const video = {
            metadata: videoResponse.data.video,
            url: `/api/video?id=${videoId}`,
        };
        // Renders the video for display in the browser.
        res.render("play-video", { video });
    });

    //
    // Web page to upload a new video.
    //
    app.get("/upload", (req, res) => {
        res.render("upload-video", {});
    });

    //
    // Web page to show the user's viewing history.
    //
    app.get("/history", async (req, res) => {
        // Retrieves the data from the history microservice.
        const historyResponse = await axios.get("http://history/history");
        // Renders the history for display in the browser.
        res.render("history", { videos: historyResponse.data.history });
    });

    //
    // HTTP GET route that streams video to the user's browser.
    //
    app.get("/api/video", async (req, res) => {
        const response = await axios({
            method: "GET",
            url: `http://video-streaming/video?id=${req.query.id}`, 
            responseType: "stream",
        });
        response.data.pipe(res);
    });

    //
    // HTTP POST route to upload video from the user's browser with a thumbnail.
    //
    app.post("/api/upload", async (req, res) => {
        const fileName = req.headers["file-name"]; // Lowercase for consistency
        const tempFilePath = path.join(os.tmpdir(), fileName); // Temporary path for the uploaded file
        const videoWriteStream = fs.createWriteStream(tempFilePath);
        console.log("HI");

        // Step 1: Save the incoming video to a temporary file
        req.pipe(videoWriteStream)
            .on('error', (err) => {
                console.error("Error saving video to temporary file: ", err);
                return res.status(500).send("Error saving video");
            })
            .on('finish', async () => {
                console.log("Video saved to temporary file. Processing...");

                const processedFilePath = path.join(os.tmpdir(), `processed_${fileName}`); // Path for processed video

                // Step 2: Add text overlay using ffmpeg
                ffmpeg(tempFilePath)
                    .outputOptions([
                        `-vf`, `drawtext=text='Thumbnail Text':fontcolor=white:fontsize=24:x=10:y=10`, // Add text
                        '-c:a', 'copy' // Copy audio without re-encoding
                    ])
                    .save(processedFilePath)
                    .on('end', async () => {
                        console.log("Video processing complete. Forwarding to upload microservice...");

                        // Step 3: Forward the processed video to the video-upload microservice
                        const fileStream = fs.createReadStream(processedFilePath);

                        try {
                            const response = await axios({
                                method: "POST",
                                url: "http://video-upload/upload", 
                                data: fileStream,
                                headers: {
                                    "content-type": req.headers["content-type"], // Fixed to lowercase
                                    "file-name": fileName,
                                },
                            });

                            // Stream the response from the video-upload microservice back to the client
                            response.data.pipe(res);

                            // Clean up temporary files
                            fs.unlink(tempFilePath, (err) => { if (err) console.error("Error deleting temp file:", err); });
                            fs.unlink(processedFilePath, (err) => { if (err) console.error("Error deleting processed file:", err); });
                        } catch (err) {
                            console.error("Error forwarding processed video: ", err);
                            res.status(500).send("Error forwarding video");
                        }
                    })
                    .on('error', (err) => {
                        console.error("Error processing video: ", err);
                        res.status(500).send("Error processing video");
                    });
            });
    });

    app.listen(PORT, () => {
        console.log("Microservice online.");
    });
}

main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });
