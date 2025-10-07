// EclipseraServer.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const os = require("os");
const path = require("path");

//Server Vars
const PORT      = 3000
let Debugging   = true

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
    if (!state || !coreFile) {
        if (Debugging) {
            console.log(`Cannot create core for '${coreFile}'. (Err.InvalidVariables)`)
        }
        return
    }
    const CoreName = path.basename(coreFile).split(" ",1)[0].toLowerCase();
    switch(state.toLowerCase()) {
        case("add"):
            if (Cores[CoreName]) {
                if (Debugging) {
                    console.log(`Cannot create core for '${coreFile} | ${CoreName}'. (Err.AlreadyExists)`)
                    console.log("")
                    console.log("")
                }
                break
            }
            if (CoreName.startsWith("node_") || CoreName.startsWith("core_") || CoreName.startsWith("new")) {
                if (Debugging) {
                    console.log(`Cannot create core for '${coreFile} | ${CoreName}'. (Err.NameInvalid)`)
                    console.log("")
                    console.log("")
                }
                break
            }
            let FoundServer = false
            const fileloc = path.join(__dirname,coreFile,"server.js")
            if (fs.existsSync(fileloc)) {
                if (Debugging) {
                    console.log(`Found server for '${coreFile} | ${CoreName}'. (Information)`)
                }
                FoundServer = true
            }
            Cores[CoreName] = {
                IsAvaliable: FoundServer
                ,File: fileloc
            }
            if (Debugging) {
                console.log(`Created server for '${coreFile} | ${CoreName}' with states: 'IsAvaliable ${FoundServer}, File ${fileloc}'. (Success)`)
                console.log("")
                console.log("")
            }
            break
    }
}

let ChokidarFile = (__dirname).replace(/\//g, "\\");

const CD = chokidar.watch(ChokidarFile, { depth: 0 });
console.log(`watching path: ${ChokidarFile}`)
CD.on("all", (event, f) => {
  console.log(`[${event}] ${f}`);
  if (event == "addDir") {
    ParseCore(f,"add")
  } else if (event == "unlinkDir") {

  }
});

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
        if (Debugging) {
            console.log("Code for coresite parsed correctly. (Success)")
        }
        res.writeHead(200);
        res.end(`Placeholder (${CoreSite})`);
    } else if (Cores[CoreSite] && !Cores[CoreSite].IsAvaliable) {
        if (Debugging) {
            console.log("Code for coresite failed. (Err.NoCore)")
        }
        res.writeHead(503)
        res.end("File unavaliable.")
    } else if (CoreSite == "favicon.ico") {
        res.writeHead(404)
        res.end()
    } else {
        if (Debugging) {
            console.log(`User attempted to load bad core.  '${CoreSite}' (Err.NoCore)`)
        }
        res.writeHead(400);
        res.end("Invalid CORE state.");
    }
    console.log("")
    console.log("")
})

server.listen(PORT, () => {
    if (Debugging) {
        console.log("-- DEBUGGING | NETWORKING --")
        console.log(`Server running on:`);
        console.log(` - Local: localhost:${PORT}`);
        if (serverIP !== "127.0.0.1") {
            console.log(` - LAN:   ${serverIP}:${PORT}`);
        }
        console.log("")
        console.log("")
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
            CD.close()
            //final
            if (Debugging) {
                console.log("Succeeded in closing.")
            }
        } catch(err) {
            if (Debugging) {
                console.log(`${err}`)
            }
            console.log(`Failed to close server.`)
        }
    }
    if (key == "d" && server.listening) {
        console.log("Toggling Debugging mode...")
        Debugging = !Debugging
        switch (Debugging) {
            case(true):
                console.log("Toggled On")
            case(false):
                console.log("Toggled Off")
        }
    }
})
