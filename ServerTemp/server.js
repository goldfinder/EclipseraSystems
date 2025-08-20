// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const SidebarExtra = [
  { text: "Inventory", url: "inventory.html" },
  { text: "Messages", url: "messages.html" },
  { text: "Friends", url: "friends.html" },
  { text: "Profile", url: "profile.html" },
  { text: "Buy Atheris", url: "atheris.html" }
];
const HeaderExtra = [
  { text: "Buy Atheris", url: "atheris.html"},
  { text: "Profile", url: "profile.html"}
]

http.createServer((req, res) => {
  // Default file
  //console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
  res.setHeader("Access-Control-Allow-Origin", "*");
  let filePath = req.url.split("?")[0];
  filePath = req.url === "/" ? "/index.html" : filePath;
  filePath = path.join(PUBLIC_DIR, filePath);
  let ExtraData = req.url.split("?")[1];

  fs.readFile(filePath, "utf8", (err, data) => {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath, ext)
    let IsLoggedIn = false  //Currently unavaliable in the site, but temporary code.
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
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("404: File Not Found");
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
      //console.log(name + " | " + ext)
      function AppendExtra(lnk,dat,liseg) {
        data = data.replace(
          /<\/(ul|nav)>/i,
          `\n${liseg ? "<li>" : ""}<a href="${lnk}">${dat}</a>${liseg ? "</li>" : ""}\n${liseg ? "</ul>" : "</nav>"}`
        );
      }
      if (contentType === "text/html" && name == "sidebar" && IsLoggedIn) {
       SidebarExtra.forEach(seg => {
        AppendExtra(seg.url,seg.text,true)
       });
      }
      if (contentType === "text/html" && name == "Header" && IsLoggedIn) {
       HeaderExtra.forEach(seg => {
        AppendExtra(seg.url,seg.text,false)
       });
      }
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

      if (contentType === "Err/NOTFOUND") {
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
