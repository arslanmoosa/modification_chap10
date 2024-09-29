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
    fetch(uploadRoute, {
        body: file,
        method: "POST",
        headers: {
            "file-name": file.name, // Lowercased to match backend handling
            "content-type": file.type, // Lowercased to match backend handling
        },
    })
    .then(() => { 
        //
        // Display that the upload has completed.
        //
        const resultsElement = document.getElementById("results");
        if (resultsElement) {
            resultsElement.innerHTML +=  `<div>${file.name}</div>`;
        }

        //
        // Clear the file from the upload input.
        //
        const uploadInput = document.getElementById("uploadInput");
        if (uploadInput) {
            uploadInput.value = null; // Clear only if the element is found
        } else {
            console.warn("Upload input element not found.");
        }
    })
    .catch((err) => { 
        console.error(`Failed to upload: ${file.name}`);
        console.error(err);

        const resultsElement = document.getElementById("results");
        if (resultsElement) {
            resultsElement.innerHTML +=  `<div>Failed ${file.name}</div>`;
        }
    });
}
