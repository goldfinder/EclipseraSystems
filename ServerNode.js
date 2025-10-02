// EclipseraServer.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const os = require("os");
const path = require("path");

//Server Vars
const PORT = 3000

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Usually returns something like 192.168.1.10
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // fallback
}

//Parse Cores
let Cores = {}
function ParseCore(coreFile,state) {
    //console.warn("In development.")
    if (!state || !coreFile) {
        return
    }
    const FileName = coreFile.toLowerCase()
    switch(state) {
        case("Add"):
            let CoreName = coreFile.split(" ",1)[0].toLowerCase()
            if (CoreName.startsWith("node_") || CoreName.startsWith("core_")) {
                break
            }
            let FoundServer = false
            const fileloc = path.join(__dirname,coreFile,"server.js")
            if (fs.existsSync(fileloc)) {
                FoundServer = true
            }
            Cores[CoreName] = {
                IsAvaliable: FoundServer
                ,File: fileloc
            }
            if (FoundServer) {
                console.log(`Core added: ${CoreName}`)
            }
            break
    }
}

fs.readdirSync(__dirname).forEach(file => {
    const fp = path.join(__dirname,file)
    const FileType = fs.lstatSync(fp)
    if (FileType.isDirectory()) {
        ParseCore(file,"Add")
    }
})

ParseCore()

const serverIP = getLocalIP();
const server = http.createServer((req, res) => {
    console.log(`[CALL] ${req.url} from ${req.socket.remoteAddress}`)
    // Parse the whole HTTP request before considering anything else
    let filePath = req.url.split("?")[0];
    if (filePath.startsWith("/")) {
        filePath = filePath.slice(1); // Pre-Remove slash
    }
    filePath = filePath.toLowerCase()
    let parts = filePath.split("/");
    let CoreSite = parts[0]
    let SubPath = parts.slice(1).join("/")
    if (CoreSite === "") {
        CoreSite = "core"
    }
    if (SubPath === "") {
        SubPath = "index"  // Replace empty sub paths with index
    }
    //Final Sanity Check
    SubPath = SubPath.toLowerCase()
    CoreSite = CoreSite.toLowerCase()
    filePath = filePath.toLowerCase()
    //Traverse Parser
    if (SubPath.includes("../")) {
        res.writeHead(406);
        return res.end("Bad Request");
    }
    //Parse Core
    console.log("Full path:", filePath || "/");
    console.log("Core site:", CoreSite);
    console.log("Sub path:", SubPath);
    console.log(CoreSite == "core")
    if (Cores[CoreSite] && Cores[CoreSite].IsAvaliable) {
        console.log("code Parsed properly :)")
        res.writeHead(200);
        res.end(`Placeholder (${CoreSite})`);
    } else if (Cores[CoreSite] && !Cores[CoreSite].IsAvaliable) {
        res.writeHead("503")
        res.end("File unavaliable.")
    } else if (CoreSite == "favicon.ico") {
        res.writeHead(404)
        res.end()
    } else {
        res.writeHead(400);
        res.end("Invalid CORE state.");
    }
})

server.listen(PORT, () => {
    console.log(`Server running on:`);
    console.log(` - Local: localhost:${PORT}`);
    if (serverIP !== "127.0.0.1") {
        console.log(` - LAN:   ${serverIP}:${PORT}`);
    }
});

process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("utf-8")

process.stdin.on("data", (key) => {
    if (key == "q" && server.listening) {
        console.log("Closing server")
        try {
            server.close()
            process.stdin.pause()
            process.stdin.removeAllListeners("data")
            //final
            console.log("Succeeded in closing.")
        } catch(err) {
            console.log(`Failed to close.  (${err})`)
        }
    }
})
