require("dotenv").config()
const fs = require("fs")
const http = require("http")
const path = require("path")
const url = require("url")
let port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname;

  // Serve index.html
  if (pathname === "/") {
    const htmlPath = path.join(__dirname, "..", "public", "index.html")
    const htmlStream = fs.createReadStream(htmlPath)
    htmlStream.pipe(res)

    htmlStream.on("error", (err) => {
      console.error("Error reading HTML:", err.message)
      res.writeHead(500)
      res.end("Server error")
    });
  }

  // Stream video with range
  else if (pathname.startsWith("/view/")) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    const filename = pathname.replace("/view/", "")
    const videoPath = path.join(__dirname, "videos", filename)

    fs.stat(videoPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end("Video not found")
        return;
      }

      const range = req.headers.range;
      if (!range) {
        res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        return res.end("Range header required");
      }

      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(videoPath, { start, end });

      fileStream.on("error", (err) => {
        console.error("Error reading video file:", err.message)
        res.writeHead(500)
        res.end("Server error")
      });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4"
      });

      fileStream.pipe(res);
    });
  }

  // Download full video file
  else if (pathname.startsWith("/download/")) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    const filename = pathname.replace("/download/", "");
    const videoPath = path.join(__dirname, "videos", filename);

    fs.stat(videoPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end("Video not found");
        return;
      }

      const downloadStream = fs.createReadStream(videoPath);

      downloadStream.on("error", (err) => {
        console.error("Error reading video for download:", err.message)
        res.writeHead(500)
        res.end("Server error")
      });

      res.writeHead(200, {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stats.size,
        "Content-Type": "video/mp4"
      });

      downloadStream.pipe(res);
    });
  }

  // Fallback 404
  else {
    res.writeHead(404);
    res.end("Not Found")
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`)
});

