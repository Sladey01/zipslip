// Import required dependencies
const express = require("express");
const fileUpload = require("express-fileupload");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

// Initialize express application
const app = express();
const PORT = 3000;

// Function to create safe and malicious zip files in the project root
const createZipFiles = () => {
    // Create safe.zip with a harmless file
    const safeZip = new AdmZip();
    safeZip.addFile("safe_file.txt", Buffer.from("This is a safe file."));
    safeZip.writeZip(path.join(__dirname, "safe.zip"));
    console.log("Created safe.zip in the project root.");

    // Create malicious.zip with a path traversal targeting ../public/index.html
    const maliciousZip = new AdmZip();
    maliciousZip.addFile("../public/index.html", Buffer.from("<html><body><h1>You’ve been hacked!</h1></body></html>"));
    maliciousZip.writeZip(path.join(__dirname, "malicious.zip"));
    console.log("Created malicious.zip in the project root to overwrite public/index.html.");
};

// Function to empty the 'extracted' directory
const clearExtractedFolder = () => {
    const extractionPath = path.join(__dirname, "extracted");
    if (fs.existsSync(extractionPath)) {
        fs.readdirSync(extractionPath).forEach(file => {
            const filePath = path.join(extractionPath, file);
            fs.unlinkSync(filePath);
        });
        console.log("Cleared the extracted folder.");
    } else {
        fs.mkdirSync(extractionPath);
    }
};

// Create zip files and clear the folder on server startup
createZipFiles();
clearExtractedFolder();

// Middleware setup
app.use(fileUpload());
app.use(express.static("public")); // Serve static files in the "public" directory
app.use("/extracted", express.static(path.join(__dirname, "extracted"))); // Serve extracted files

// Custom route to serve contents of 'extracted' folder dynamically if needed
app.get("/extracted", (req, res) => {
    const extractionPath = path.join(__dirname, "extracted");

    // Check if the directory exists and read files
    if (fs.existsSync(extractionPath)) {
        const files = fs.readdirSync(extractionPath);
        res.send(
            `<h1>Extracted Files</h1><ul>${files
                .map(file => `<li><a href="/extracted/${file}" target="_blank">${file}</a></li>`)
                .join("")}</ul>`
        );
    } else {
        res.send("No files found in the extracted directory.");
    }
});

// File upload and extraction endpoint
app.post("/upload", (req, res) => {
    if (!req.files || !req.files.zipFile) {
        return res.status(400).send("No file uploaded.");
    }

    const zipFile = req.files.zipFile;
    const zip = new AdmZip(zipFile.data);
    const extractionBase = __dirname; // Set base extraction path to project root

    let result = "";

    zip.getEntries().forEach(entry => {
        // Construct the full path for extraction based on the project root directory
        const entryPath = path.join(extractionBase, entry.entryName);

        // Ensure the directory exists before writing the file
        const directory = path.dirname(entryPath);
        fs.mkdirSync(directory, { recursive: true });

        // Extract file and log the path
        fs.writeFileSync(entryPath, entry.getData());
        console.log(`Extracted: ${entryPath}`);
        result += `Extracted: ${entry.entryName}\n`;

        // Display contents of the file
        const content = fs.readFileSync(entryPath, "utf-8");
        result += `Content of ${entry.entryName}:\n${content}\n`;
    });

    res.send(result || "Files extracted safely.");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
