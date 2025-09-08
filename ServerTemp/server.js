// server.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const path = require("path");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const SITE_SOURS = path.join(PUBLIC_DIR, "SiteSources")
const PLRDAT_SOU = path.join(PUBLIC_DIR, "PlayerSources")

const PlayerData = {};
const fragments = {};
const ErrorData = {};

["LoggedInSidebarContainer", "SidebarContainer", "Footer", "LoggedInHeader", "Header"].forEach(name => {
  let FPATHName = name + ".html"
  if (name == "SidebarContainer") {
    FPATHName = "sidebar.html"
  }
  if (name == "LoggedInSidebarContainer") {
    FPATHName = "LoggedSidebar.html"
  }
  if (name == "LoggedInHeader") {
    FPATHName = "LoggedHeader.html"
  }
  console.log(FPATHName + " | " + name)
  const fragPath = path.join(SITE_SOURS, FPATHName);
  try {
    fragments[name] = fs.readFileSync(fragPath, "utf8");
  } catch {
    fragments[name] = `<!-- Fragment Load Fail: ${name} -->`;
  }
});

ErrorData["ExtraContentType"] = "ERR/CodeCheck"

const errorPage = path.join(PUBLIC_DIR, "error.html");
fs.readFile(errorPage, "utf8", (err404, data404) => {
  const ext = path.extname(errorPage).toLowerCase();
  if (ext === ".html") {
    console.log("Showing 404")
    if (err404) {
      // fallback if 404.html missing
      ErrorData["contentType"] = "text/plain"
      ErrorData["data"] = "ERROR - 404 HTML and origin content Not found."
    } else {
      ErrorData["contentType"] = "text/html"
      ErrorData["data"] = data404
    }
  } else {
    ErrorData["contentType"] = "ERR/text/plain"
    ErrorData["data"] = "ERROR - 404 HTML and origin content Not found."
  }
});

// Initialize watcher
const watcher = chokidar.watch(PLRDAT_SOU, {
  persistent: true,
  ignoreInitial: true, // skip existing files
  depth: 0,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100
  }
});

// Read all files in the folder
fs.readdir(PLRDAT_SOU, (err, files) => {
  if (err) {
    return console.error('Error reading player folder:', err);
  }

  files.forEach(file => {
    const filePath = path.join(PLRDAT_SOU, file);

    // Only process .json files
    if (path.extname(filePath) === '.json') {
      const userId = path.parse(file).name;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // Assuming your JSON has 'id' and 'name' fields
        if (data.Name) {
          PlayerData[userId] = data.Name;
          console.log(userId, data.Name)
        }
      } catch (err) {
        console.error(`Error reading JSON from ${filePath}:`, err);
      }
    }
  });

  console.log('PlayerData loaded');
});

// Only handle added files
watcher.on('add', path => {
  try {
    const data = fs.readFileSync(path, 'utf-8');
    const json = JSON.parse(data);

    if (json.name) {
      PlayerData[path.basename(path)] = json.name
    } else {
      console.log(`New player file added but 'name' field missing: ${path}`);
    }
  } catch (err) {
    console.error(`Error reading JSON from ${path}:`, err);
  }
});

http.createServer((req, res) => {
  // Default file
  //console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
  res.setHeader("Access-Control-Allow-Origin", "*");
  let filePath = req.url.split("?")[0];
  filePath = req.url === "/" ? "/index.html" : filePath;
  filePath = path.join(PUBLIC_DIR, filePath);
  let ExtraData = req.url.split("?")[1];
  let contentType = "Err/NOTFOUND";
  fs.readFile(filePath, "utf8", (err, datastream) => {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath, ext)
    let data = datastream
    let IsLoggedIn = -1  //Currently unavaliable in the site, but temporary code.
    if (err) {
      contentType = ErrorData["ExtraContentType"]
      data = ErrorData["data"]
    } else {
      // MIME type handling
      if (ext === ".js") contentType = "text/javascript";
      if (ext === ".css") contentType = "text/css";
      if (ext === ".json") contentType = "application/json";
      if (ext === ".png") contentType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      if (ext === ".svg") contentType = "image/svg+xml";
      if (ext === ".html") contentType = "text/html";
      //console.log(name + " | " + ext)
      function AppendExtra(lnk, dat, liseg) {
        if (lnk == "profile.html") {
          data = data.replace(
            /<\/(ul|nav)>/i,
            `\n${liseg ? "<li>" : ""}<a href="${lnk + "?p=" + IsLoggedIn}">${dat}</a>${liseg ? "</li>" : ""}\n${liseg ? "</ul>" : "</nav>"}`
          );
        } else {
          data = data.replace(
            /<\/(ul|nav)>/i,
            `\n${liseg ? "<li>" : ""}<a href="${lnk}">${dat}</a>${liseg ? "</li>" : ""}\n${liseg ? "</ul>" : "</nav>"}`
          );
        }
      }
      // Inject ExtraData only for HTML files
      if (contentType == "text/html" && ExtraData) {
        data = data.replace(
          /<body[^>]*>/i,
          `$&<script>window.EXTRA_DATA="${ExtraData}";</script>`
        );
      } else if (contentType === "text/html" && name == "profile" && IsLoggedIn) {
        data = data.replace(
          /<body[^>]*>/i,
          `$&<script>window.EXTRA_DATA="P=${IsLoggedIn}";</script>`
        );
      }
      else {
        data = data.replace(
          /<body[^>]*>/i,
          `$&<script>window.EXTRA_DATA="ND";</script>`
        );
      }
    }
    if (contentType == "text/html" || contentType == ErrorData["ExtraContentType"]) {
      console.log(data)
      data = data.replace(
        /<!--\s*~DivContainer:(\w+)\s*-->/g,
        (_, name) => {

          if (name == "SidebarContainer" && IsLoggedIn) {
            return fragments["LoggedInSidebarContainer"]
          }
          if (name == "Header" && IsLoggedIn) {
            return fragments["LoggedInHeader"]
          }
          return fragments[name] || `<!-- Unknown fragment: ${name} -->`
        }
      );
      data = data.replace(
        /{ATH}/g,
        "ERR"
      )
      data = data.replace(
        /{AMY}/g,
        "ERR"
      )
      data = data.replace(
        /{SOL}/g,
        "ERR"
      )
      data = data.replace(
        /{UNAME}/g,
        IsLoggedIn ? PlayerData[IsLoggedIn] : "Err"
      )
      data = data.replace(
        /{PLRID}/g,
        IsLoggedIn ? IsLoggedIn : "Err"
      )
    }
    console.log(contentType)
    if (contentType === "Err/NOTFOUND" || contentType === ErrorData["ExtraContentType"]) {

      if (contentType == ErrorData["ExtraContentType"]) {
        res.writeHead(404, { "Content-Type": ErrorData["contentType"] });
        res.end(data);
      }

      console.log("Written data with 404")
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
      if (contentType == "text/html") {
        console.log("Written data with 200")
      }
    }
  }
  );
}).listen(PORT, () => {
  console.log(`Server running at http://192.168.87.101:${PORT}`);
});
