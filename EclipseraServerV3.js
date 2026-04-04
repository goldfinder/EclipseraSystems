//EclipseraServerV3.js
const http = require("http");
const fs = require("fs");
const chokidar = require("chokidar")
const os = require("os");
const path = require("path");
const { fileURLToPath } = require("url");

//Server Vars
const PORT=3000
let Ident = null
let Debugging = null

//EngineBase
function getLocalIP() {
	const interfaces = os.networkInterfaces();
	for (const name in interfaces) {
		for (const iface of interfaces[name]) {
			if (iface.family === "IPv4" && !iface.internal) {
				return iface.address;
			}
		}
	}
	return "127.0.0.1"
}

function print(...args) { //So I don't get confused why print() doesn't work
	if (Ident === null) {
		console.log(...args)
	} else if (Ident !== null) {
		console.log(Ident+" | ",...args)
	}
}
function debugSend(str) {
	if(Debugging) {
		print(`[DEBUG] | ${str}`)
	}
}

//Server

const serverIP = getLocalIP();
print(serverIP)

const server = http.createServer((req, res) => {
	const urlParts = req.url.split("?");
    let filePath = urlParts[0]
    const query = urlParts[1] || ""
    if (filePath.startsWith("/")) {
        filePath = filePath.slice(1); // Pre-Remove slash
    }
    const callerstate = (`${req.socket.remoteAddress}` === "::1" && "Localhost:Host" || `${req.socket.remoteAddress}` === "::::ffff:127.0.0.1" && "Localhost:Host" || `${req.socket.remoteAddress}`)
    debugSend(`[CALL] ${filePath} from ${callerstate}, ${query}`)
    res.writeHead(404)
    return res.end();
})

server.listen(PORT, () => {
    debugSend("-- DEBUGGING | NETWORKING --")
    debugSend(`Server running on:`);
    debugSend(` - Local: localhost:${PORT}`);
    if (serverIP !== "127.0.0.1") {
        debugSend(` - LAN:   ${serverIP}:${PORT}`);
    }
    debugSend("")
    debugSend("")
});

process.on('message',(packet) => {
	//Type Checker
	if (packet.type === "Debugging") {
		print("Recieved a packet to change debugging:",Debugging,">",packet.value)
		Debugging = packet.value
	}
	if (packet.type === "ServerIdent"){
		Ident = packet.value
		debugSend("Identified")
	}
	if (packet.type === "InternalNotifier"){
		if (packet.value === "Shutdown") {
			process.exit(0)
		}
	}
})
