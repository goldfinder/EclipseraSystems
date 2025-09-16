// server.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const path = require("path");
const { serialize } = require("v8");
const { userInfo } = require("os");
const { json } = require("stream/consumers");

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
  } catch (err) {
    if (!fragments[service]) fragments[service] = {};
    fragments[service][name] = `<!-- Fragment Load Fail: ${service}:${name} -->`;
    console.log(`Fragment Failure: ${service}:${name} | ${err}`)
  }
}


/* Fragment loader */

//DivCon
console.log("Loading divcontainer fragments.")
loadFragment("DivContainer", "SidebarContainer", "sidebar.html")
loadFragment("DivContainer", "LoggedInSidebarContainer", "LoggedSidebar.html")
loadFragment("DivContainer", "AdminSidebarContainer", "AdminSidebar.html")
loadFragment("DivContainer", "Header", "Header.html")
loadFragment("DivContainer", "LoggedInHeader", "LoggedHeader.html")
loadFragment("DivContainer", "Footer", "Footer.html")
loadFragment("DivContainer", "LoginType", "LoginPage.html")
console.log("Loaded divcontainer fragments.")

/* Fragment Loader */
/* Services */

Services.BadgeService = function (name, UserId) {
  switch (name) {
    case "Contributor":
      return PlayerData[UserId]["Public"]["Badges"].includes("Contributor") ? BadgeData["contributor.Badge"] : ""
    case "BadgeStaff":
      if (PlayerData[UserId]["Public"]["Staff"]?.length === 0 || PlayerData[UserId]["Public"]["Staff"][1] == "TMP") {
        return ""
      }
      if (PlayerData[UserId]["Public"]["Staff"][0] === "Corporate") {
        return BadgeData["Corporate.Staff"]
      }
      return BadgeData["Staff.Staff"]
    case "StaffPos":
      return BadgeData[PlayerData[UserId]["Public"]["Staff"][1] + ".Staff"] ? BadgeData[PlayerData[UserId]["Public"]["Staff"][1] + ".Staff"] : ""
    case "Legacy":
      return PlayerData[UserId]["Public"]["Badges"].includes("LEGACY") ? BadgeData["Legacy.Badge"] : ""
    case "BC":
      if (PlayerData[UserId]["Public"]["Badges"].includes("BC4")) {
        return BadgeData["MBC.Subscription"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("BC3")) {
        return BadgeData["OBC.Subscription"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("BC2")) {
        return BadgeData["TBC.Subscription"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("BC1")) {
        return BadgeData["BC.Subscription"]
      }
      return ""
    case "ContentCreator":
      if (PlayerData[UserId]["Public"]["Badges"].includes("CC-YT")) {
        return BadgeData["cc-youtube.ContentCreator"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("CC-TW")) {
        return BadgeData["cc-twitch.ContentCreator"]
      }
      return ""
    case "FNDRCLB":
      if (PlayerData[UserId]["Public"]["Badges"].includes("FC3")) {
        return BadgeData["goldfounder.Subscription"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("FC2")) {
        return BadgeData["silvfounder.Subscription"]
      }
      if (PlayerData[UserId]["Public"]["Badges"].includes("FC1")) {
        return BadgeData["bronfounder.Subscription"]
      }
      return ""
    case "FF":
      return PlayerData[UserId]["Public"]["Badges"].includes("FF") ? BadgeData["founderfamily.Badge"] : ""
    default:
      console.log(name, UserId)
      return ""
  }
}

/* Services */
/* Engine Functions */

function ShowShortenedNumber(number) {
  if (number >= 1_000_000) {
    let NSTR = Math.floor(number / 100_000)/10
    if (NSTR.toString().length === 5) {
      NSTR = Math.floor(number / 1_000_000)
    }
    return NSTR + 'M';
  } else if (number >= 1_000) {
    let NSTR = Math.floor(number / 100)/10
    if (NSTR.toString().length === 5) {
      NSTR = Math.floor(number / 1_000)
    }
    return NSTR + 'K';
  } else {
    return number.toString();
  }
}

function StaffAccess(UID) {
  const staff = PlayerData[UID]?.staff
  if (!staff) return 0

  let Rank = 0
  const [companyRole,EclipseraRank,RBXRCRank,Department] = staff 

  switch (EclipseraRank) {
    case "Founder":
      Rank = Math.max(Rank, 999)
    case "CFounder":
      Rank = Math.max(Rank, 998)
    case "CHoSa":
      Rank = Math.max(Rank, 500)
    case "CHoSt":
      Rank = Math.max(Rank, 400)
  }
  if (companyRole == "Corporate") {
    Rank = Math.max(Rank, 100)
  }
  switch (RBXRCRank) {
    case "PRHead":
      Rank = Math.max(Rank, 10)
    case "MODHead":
      Rank = Math.max(Rank, 40)
    case "ADMHead":
      Rank = Math.max(Rank, 50)
    case "CSCHead":
      Rank = Math.max(Rank, 80)
  }
  switch (Department) {
    case "CSC":
      Rank = Math.max(Rank, 45)
    case "PR":
      Rank = Math.max(Rank, 5)
    case "ADM":
      Rank = Math.max(Rank, 20)
    case "MOD":
      Rank = Math.max(Rank, 15)
  }
  console.log(Rank)
  return Rank
}

function CreateProfile(UID, JSONFile) {
  try {
    const fileContents = fs.readFileSync(JSONFile, 'utf8');
    const data = JSON.parse(fileContents)
    if (data.Name && data.CreationDate && PlayerData[UID] === undefined) {
      console.log(data.SOL ?? 0,data.AMY ?? 0,data.ATH ?? 0)
      PlayerData[UID] = {
        "Name": data.Name,
        "Date": data.CreationDate,
        "AboutMe": data.AboutMe || "A generic RBXRC user.",

        "Currency": {
          ATH: data.ATH ?? 0,
          AMY: data.AMY ?? 0,
          SOL: data.SOL ?? 0,
        },

        "Public": {
          Staff: Array.isArray(data.Staff) ? [...data.Staff] : [],
          Badges: Array.isArray(data.Badges) ? [...data.Badges] : []
        },

        "Private": {
          DiscordId: data.DiscordId || null
        },

        "Server": {
          Password: data.password || null,
          Salt: data.salt || null
        }
      }
      if (Array.isArray(data.Staff) && data.Staff.length > 0 && PlayerData[UID]["ProfileColor"] === undefined && PlayerData[UID]["Public"]["Staff"][1] !== "TMP") {
        console.log("8")
        PlayerData[UID]["ProfileColor"] = "profile-info-staff"
      }
      if (data["Badges"].includes("FF") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("7")
        PlayerData[UID]["ProfileColor"] = "profile-info-ff"
      }
      if (data["Badges"].includes("CC-YT") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("6")
        PlayerData[UID]["ProfileColor"] = "profile-info-cc-yt"
      }
      if (data["Badges"].includes("CC-TW") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("5")
        PlayerData[UID]["ProfileColor"] = "profile-info-cc-tw"
      }
      if (data["Badges"].includes("FC3") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("4")
        PlayerData[UID]["ProfileColor"] = "profile-info-gf"
      }
      if (data["Badges"].includes("FC2") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("3")
        PlayerData[UID]["ProfileColor"] = "profile-info-sf"
      }
      if (data["Badges"].includes("FC1") && PlayerData[UID]["ProfileColor"] === undefined) {
        console.log("2")
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
      const PARSE = path.parse(file)
      console.log(PARSE)
      let EXT = PARSE.ext
      EXT = EXT.slice(1)
      let NAME = PARSE.name
      const typeMap = {
        subs: "Subscription",
        stf: "Staff",
        bdg: "Badge",
        evt: "Event",
        cont: "ContentCreator",
        // add more as needed
      };
      const BadgeName = `${NAME}.${typeMap[EXT] || EXT}`;
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
  console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
  let body = ""
  req.on("data", chunk => {
    body += chunk.toString()
  })
  req.on("end", () => {
    console.log(`${body}`)
  })
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
              return Services[service](name, ViewingProfile)
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
          console.log(service, name)
          if (service === "DivContainer" && IsLoggedIn) {
            const staff = StaffAccess(IsLoggedIn)

            if (fragments[service]["Admin" + name] && staff > 0) {
              console.log("Sending a fragment in Admin State")
              return fragments[service]["Admin" + name]
            }
            if (fragments[service]["LoggedIn" + name]) {
              console.log("Sending a fragment in LoggedIn State")
              return fragments[service]["LoggedIn" + name] || `<!-- Fragment Failure: ${service}:${name} -->`
            }
          }


          console.log("Sending a fragment in General State")

          //return fragments[service] ? (fragments[service][name] ? fragments[service][name] : `<!-- Unknown fragment: ${service}:${name} -->`) : 
          return fragments[service]?.[name] ?? `<!-- Unknown fragment: ${service}:${name} -->`
          /*
          if (fragments[service] && fragments[service][name]) {
            return fragments[service][name]
          }
          return `<!-- Unknown fragment: ${service}:${name} -->`
          */
        }
      );
      data = data.replace(
        /{ATH}/g,
        IsLoggedIn ? ShowShortenedNumber(PlayerData[IsLoggedIn]["Currency"]["ATH"]) : "ERR"
      )
      data = data.replace(
        /{AMY}/g,
        IsLoggedIn ? ShowShortenedNumber(PlayerData[IsLoggedIn]["Currency"]["AMY"]) : "ERR"
      )
      data = data.replace(
        /{AMY-PRF}/g,
        ViewingProfile ? ShowShortenedNumber(PlayerData[ViewingProfile]["Currency"]["AMY"]) : "ERR"
      )
      data = data.replace(
        /{SOL-PRF}/g,
        ViewingProfile ? ShowShortenedNumber(PlayerData[ViewingProfile]["Currency"]["SOL"]) : "ERR"
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
        IsLoggedIn ? ShowShortenedNumber(PlayerData[IsLoggedIn]["Currency"]["SOL"]) : "ERR"
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
