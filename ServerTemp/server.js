// server.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const path = require("path");
const { serialize } = require("v8");
const { userInfo } = require("os");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const SITE_SOURS = path.join(PUBLIC_DIR, "SiteSources")
const PLRDAT_SOU = path.join(PUBLIC_DIR, "PlayerSources")
const BADGES_SOU = path.join(PUBLIC_DIR, "BadgeData")

const PlayerData = {};
const fragments = {};
const BadgeData = {};
const Services = {};
const ErrorData = {};
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function loadFragment(service, name, filename) {
  console.log(`Loading service ${service}:${name}`)
  const fragPath = path.join(SITE_SOURS, filename);
  try {
    const content = fs.readFileSync(fragPath, "utf8");
    if (!fragments[service]) fragments[service] = {};
    fragments[service][name] = content;
    console.log(`Fragment Loaded: ${service}:${name}`)
  } catch {
    if (!fragments[service]) fragments[service] = {};
    fragments[service][name] = `<!-- Fragment Load Fail: ${service}:${name} -->`;
    console.log(`Fragment Failure: ${service}:${name}`)
  }
}


/* Fragment loader */

//DivCon
console.log("Loading divcontainer fragments.")
loadFragment("DivContainer", "SidebarContainer", "sidebar.html")
loadFragment("DivContainer", "LoggedInSidebarContainer", "LoggedSidebar.html")
loadFragment("DivContainer", "Header", "Header.html")
loadFragment("DivContainer", "LoggedInHeader", "LoggedHeader.html")
loadFragment("DivContainer", "Footer", "Footer.html")
console.log("Loaded divcontainer fragments.")

/* Fragment Loader */
/* Services */

Services.BadgeService = function (name, UserId) {
  switch (name) {
    case "Contributor":
      return PlayerData[UserId]["Badges"].includes("Contributor") ? BadgeData["contributor"] : ""
    case "BadgeStaff":
      if (PlayerData[UserId]["Staff"]?.length === 0) {
        return ""
      }
      if (PlayerData[UserId]["Staff"][0] === "Corporate") {
        return BadgeData["Corporate"]
      }
      return BadgeData["Staff"]
    case "StaffPos":
      return BadgeData[PlayerData[UserId]["Staff"][1]] ? BadgeData[PlayerData[UserId]["Staff"][1]] : ""
    case "Legacy":
      return PlayerData[UserId]["Badges"].includes("LEGACY") ? BadgeData["Legacy"] : ""
    case "BC":
      if (PlayerData[UserId]["Badges"].includes("BC4")) {
        return BadgeData["MBC"]
      }
      if (PlayerData[UserId]["Badges"].includes("BC3")) {
        return BadgeData["OBC"]
      }
      if (PlayerData[UserId]["Badges"].includes("BC2")) {
        return BadgeData["TBC"]
      }
      if (PlayerData[UserId]["Badges"].includes("BC1")) {
        return BadgeData["BC"]
      }
      return ""
    case "FNDRCLB":
      if (PlayerData[UserId]["Badges"].includes("FC3")) {
        return BadgeData["goldfounder"]
      }
      if (PlayerData[UserId]["Badges"].includes("FC2")) {
        return BadgeData["silvfounder"]
      }
      if (PlayerData[UserId]["Badges"].includes("FC1")) {
        return BadgeData["bronfounder"]
      }
      return ""
    case "FF":
      return PlayerData[UserId]["Badges"].includes("FF") ? BadgeData["founderfamily"] : ""
  }
  console.log(name,UserId)
}


ErrorData["ExtraContentType"] = "ERR/CodeCheck"

const errorPage = path.join(PUBLIC_DIR, "error.html");
fs.readFile(errorPage, "utf8", (err404, data404) => {
  const ext = path.extname(errorPage).toLowerCase();
  if (ext === ".html") {
    if (err404) {
      // fallback if 404.html missing
      ErrorData["contentType"] = "text/plain"
      ErrorData["data"] = "ERROR - 404 HTML and origin content Not found."
    } else {
      ErrorData["contentType"] = "text/html"
      ErrorData["data"] = data404
    }
  } else {
    ErrorData["contentType"] = "text/plain"
    ErrorData["data"] = "ERROR - 404 HTML and origin content Not found."
  }
  console.log(ErrorData["contentType"])
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

function CreateProfile(UID, JSONFile) {
  try {
    const fileContents = fs.readFileSync(JSONFile, 'utf8');
    const data = JSON.parse(fileContents)
    if (data.Name && data.CreationDate && PlayerData[UID] === undefined) {
      PlayerData[UID] = {};
      PlayerData[UID]["Name"] = data.Name;
      PlayerData[UID]["Date"] = data.CreationDate;
      PlayerData[UID]["AboutMe"] = data.AboutMe ? data.AboutMe : "A generic RBXRC user."
      PlayerData[UID]["Staff"] = Array.isArray(data.Staff) ? [...data.Staff] : []
      PlayerData[UID]["Badges"] = Array.isArray(data.Badges) ? [...data.Badges] : []
      if ( PlayerData[UID]["Staff"].length > 0 && PlayerData[UID]["ProfileColor"] === undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-staff"
      }
      if (PlayerData[UID]["Badges"].includes("FF") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-ff"
      }
      if (PlayerData[UID]["Badges"].includes("CC-YT") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-cc-yt"
      }
      if (PlayerData[UID]["Badges"].includes("CC-TW") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-cc-tw"
      }
      if (PlayerData[UID]["Badges"].includes("FC3") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-gf"
      }
      if (PlayerData[UID]["Badges"].includes("FC2") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-sf"
      }
      if (PlayerData[UID]["Badges"].includes("FC1") && PlayerData[UID]["ProfileColor"] == undefined) {
        PlayerData[UID]["ProfileColor"] = "profile-info-bf"
      }
      console.log(`Profile loaded: ${UID}`)
    } else {
      throw "Character profile missing data or already created."
    }
  } catch (err) {
    console.error(`Data failure for profile ${UID} | ${err}`)
  }
}

// Read all files in the folder
fs.readdir(PLRDAT_SOU, (err, files) => {
  if (err) {
    return console.error('Error reading player folder:', err);
  }

  files.forEach(file => {
    const filePath = path.join(PLRDAT_SOU, file);
    if (path.extname(filePath) === '.json') {
      const userId = path.parse(file).name;
      CreateProfile(userId, filePath)
    }
  });

  console.log('PlayerData loaded');
});

fs.readdir(BADGES_SOU, (err, files) => {
  if (err) {
    return console.error('Error reading player folder:', err);
  }

  files.forEach(file => {
    try {
      const filePath = path.join(BADGES_SOU, file);
      const filedat = fs.readFileSync(filePath, 'utf8');
      const BadgeName = path.parse(file).name;
      BadgeData[BadgeName] = filedat
      console.log(`Badge '${BadgeName}' loaded`)
    } catch (err) {
      console.log("Failed to load badge.", err)
    }
  });

  console.log('Badges loaded');
});


// Only handle added files
watcher.on('add', pth => {
  try {
    const filePath = pth;
    if (path.extname(filePath) === '.json') {
      const userId = path.parse(filePath).name;
      CreateProfile(userId, filePath)
    }
  } catch (err) {
    console.error(`Error reading JSON from ${pth}:`, err);
  }
});

http.createServer((req, res) => {
  // Default file
  //console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
  res.setHeader("Access-Control-Allow-Origin", "*");
  let filePath = req.url.split("?")[0];
  filePath = req.url === "/" ? "/index.html" : filePath;
  filePath = path.join(PUBLIC_DIR, filePath);
  let queryString = "";
  const idx = req.url.indexOf("?");
  if (idx !== -1) queryString = req.url.slice(idx + 1);
  let contentType = "Err/NOTFOUND";
  fs.readFile(filePath, "utf8", (err, datastream) => {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath, ext)
    let data = datastream
    let IsLoggedIn = -1  //Currently unavaliable in the site, but temporary code.
    let ViewingProfile = false
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
      // Check URI
      console.log(name, contentType)
      if (name == "profile" && contentType == "text/html") {
        ViewingProfile = true
      }
      // Inject ExtraData only for HTML files
      if (contentType == "text/html") {
        let extra = {}
        if (IsLoggedIn) {
          extra.UID = IsLoggedIn
        }
        if (queryString !== "") {
          const pairs = queryString.split("&")
          for (const pair of pairs) {
            const [key, value] = pair.split("=")
            if (key) {
              extra[key] = value ? decodeURIComponent(value) : true;
            }
          }
        }
         console.log(ViewingProfile)
        if (ViewingProfile) {
          ViewingProfile = extra["p"] ? extra["p"] : (extra["UID"] ? extra["UID"] : false)
          if (PlayerData[ViewingProfile] === undefined) {
            ViewingProfile = false
          }
        }
        console.log(extra); // For debugging
        console.log(ViewingProfile)
      }
      // Parse profiles
      if (name == "profile" && contentType == "text/html") {
        data = data.replace(
          /<!--\s*~(\w+):(\w+)\s*-->/g,
          (_, service, name) => {
            if (Services[service] && ViewingProfile) {
              return Services[service](name,ViewingProfile)
            }
            return _;
          }
        );
      }
    }
    if (ViewingProfile === false && name == "profile" && contentType == "text/html") {
        data = ErrorData["data"]
    }
    if (contentType == "text/html" || contentType == ErrorData["ExtraContentType"]) {
      data = data.replace(
        /<!--\s*~(\w+):(\w+)\s*-->/g,
        (_, service, name) => {
          if (service === "DivContainer" && IsLoggedIn) {
            if (fragments[service]["LoggedIn" + name]) {
              return fragments[service]["LoggedIn" + name] || `<!-- Fragment Failure: ${service}:${name} -->`
            }
          }



          return fragments[service] ? fragments[service][name] : `<!-- Unknown fragment: ${service}:${name} -->`
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
        /{AMY-PRF}/g,
        "ERR"
      )
      data = data.replace(
        /{SOL-PRF}/g,
        "ERR"
      )
      data = data.replace(
        /{FRDCNT-PRF}/g,
        "ERR"
      )
      data = data.replace(
        /{GRPCNT-PRF}/g,
        "ERR"
      )
      data = data.replace(
        /{SOL}/g,
        "ERR"
      )
      data = data.replace(
        /{PFINFO}/g,
        (_) => {
          if (ViewingProfile) {
            let x = PlayerData[ViewingProfile]["ProfileColor"] ? PlayerData[ViewingProfile]["ProfileColor"] : "profile-info"
            return x
          }
          return "profile-info"
        }
      )
      data = data.replace(
        /{JOIN-PRF}/g,
        (_) => {
          if (ViewingProfile) {
            let data = ViewingProfile ? PlayerData[ViewingProfile]["Date"] : "ERR"
            let creationdate = data.split(":")
            let month = months[parseInt(creationdate[1], 10) - 1]
            let year = creationdate[0]
            let day = creationdate[2]
            let str = "ERR"
            if (month && year && day) {
              str = `${month} ${day}, ${year}`
            }
            return str
          }
          return "ERR"
        }
      )
      data = data.replace(
        /{USR-PRF}/g,
        ViewingProfile ? PlayerData[ViewingProfile]["Name"] : "ERR"
      )
      data = data.replace(
        /{ABTME-PRF}/g,
        ViewingProfile ? PlayerData[ViewingProfile]["AboutMe"] : "ERR"
      )
      data = data.replace(
        /{UNAME}/g,
        IsLoggedIn ? PlayerData[IsLoggedIn]["Name"] : "ERR"
      )
      data = data.replace(
        /{PLRID}/g,
        IsLoggedIn ? IsLoggedIn : "ERR"
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
