

//
// Upload a collection of files to the backend.
//
function uploadFiles(files) {
    for (let i = 0; i < files.length; ++i) {
        uploadFile(files[i]);
    }
}

//
// Upload a file from the browser to the backend API.
//
function uploadFile(file) {
    const uploadRoute = `/api/upload`;

    // Create a video element to generate a thumbnail
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    video.addEventListener('loadeddata', function() {
        // Create a canvas to capture the thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match video frame
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the first frame of the video onto the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert the canvas content to a data URL (base64 image)
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg');
        console.log('Thumbnail generated:', thumbnailDataUrl);

        // Prepare the FormData object for the video and thumbnail
        const formData = new FormData();
        formData.append("video", file);
        formData.append("thumbnail", thumbnailDataUrl); // Send the thumbnail as a base64 string

        // Upload the video and thumbnail to the server
        fetch(uploadRoute, {
                body: formData,
                method: "POST"
            })
            .then(() => { 
                // Display that the upload has completed.
                const resultsElement = document.getElementById("results");
                resultsElement.innerHTML +=  `<div>${file.name}</div>`;

                // Clear the file form the upload input.
                const uploadInput = document.getElementById("uploadInput");
                uploadInput.value = null;
            })
            .catch((err) => { 
                console.error(`Failed to upload: ${file.name}`);
                console.error(err);

                const resultsElement = document.getElementById("results");
                resultsElement.innerHTML +=  `<div>Failed ${file.name}</div>`;
            });
    });
}
