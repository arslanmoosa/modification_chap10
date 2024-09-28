const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/videosDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Video schema
const videoSchema = new mongoose.Schema({
  title: String,
  url: String,
  thumbnailUrl: String,
});

const Video = mongoose.model('Video', videoSchema);

// API to fetch all videos
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    res.status(500).send('Error fetching videos');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/videos', async (req, res) => {
    try {
      const videos = await Video.find();
  
      // Generate HTML with download buttons for each video
      let htmlResponse = '<h1>Video List</h1>';
      videos.forEach(video => {
        htmlResponse += `
          <div>
            <h3>${video.title}</h3>
            <video width="320" height="240" controls>
              <source src="${video.url}" type="video/mp4">
            </video>
            <br>
            <a href="${video.thumbnailUrl}" download>
              <button>Download Thumbnail</button>
            </a>
          </div>
        `;
      });
  
      res.send(htmlResponse);
    } catch (error) {
      res.status(500).send('Error fetching videos');
    }
  });
  