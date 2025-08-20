// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

http.createServer((req, res) => {
  // Default file
  console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
  res.setHeader("Access-Control-Allow-Origin", "*");
  let filePath = req.url.split("?")[0];
  filePath = req.url === "/" ? "/index.html" : filePath;
  filePath = path.join(PUBLIC_DIR, filePath);
  let ExtraData = req.url.split("?")[1];

  fs.readFile(filePath, "utf8", (err, data) => {
    const ext = path.extname(filePath).toLowerCase();
    if (err) {
      
      // File not found, serve custom 404.html
      const errorPage = path.join(PUBLIC_DIR, "error.html");
      fs.readFile(errorPage, (err404, data404) => {
        if (ext === ".html") {
          console.log("Showing 404")
          if (err404) {
            // fallback if 404.html missing
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404: File Not Found");
          } else {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end(data404);
          }
        }
      });
    } else {
      // MIME type handling
      let contentType = "Err/NOTFOUND";
      if (ext === ".js") contentType = "text/javascript";
      if (ext === ".css") contentType = "text/css";
      if (ext === ".json") contentType = "application/json";
      if (ext === ".png") contentType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      if (ext === ".svg") contentType = "image/svg+xml";
      if (ext === ".html") contentType = "text/html";

      // Inject ExtraData only for HTML files
      if (contentType == "text/html" && ExtraData) {
        data = data.replace(
          /<body[^>]*>/i,
          `$&<script>window.EXTRA_DATA="${ExtraData}";</script>`
        );
      } else {
        data = data.replace(
          /<body[^>]*>/i,
          `$&<script>window.EXTRA_DATA="ND";</script>`
        );
      }

      if (contentType === "Err/NOTFOUND"){
        res.writeHead(404, { "Content-Type": contentType });
        res.end(data);
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      }
    }
  });
}).listen(PORT, () => {
  console.log(`Server running at http://192.168.87.101:${PORT}`);
});
