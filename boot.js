//Systems
const os = require("os");
const path = require("path");
const { fileURLToPath } = require("url");
const { fork } = require('child_process');

//Vars
let Debugging = true
let state = "SystemBooting"
//States - SystemBooting (Load), ServerActive (Running), WaitingServerType (custom handler)
let WaitingResolved = false
let WaitingTimer = null
let Closing = false
let ServerInt = 0
let child = null

const RESET = "\x1b[0m";
const BOOTER_COLOR = "\x1b[32m"; // Green
const SERVER_COLOR = "\x1b[36m"; // Cyan
const DEBUGCOL = "\x1b[33;1m"
const ERROR_COLOR = "\x1b[31m";  // Red

const KEYMAP = {
  "\x1b[C": "RIGHT",
  "\x1b[D": "LEFT",
  "\x1b[A": "UP",
  "\x1b[B": "DOWN",
  "\r": "ENTER",
  "\u0003": "CTRL_C",
};
const Servers = [
	"V3",
	"V2"
]

//EngineBase
function debugSend(...args) {
	if(Debugging) {
		console.log(`${DEBUGCOL}[DEBUG]${RESET}${BOOTER_COLOR}[BOOTER]${RESET} | `,...args)
	}
}
function print(...args) { // So I don't get confused why print() doesn't work
	console.log(`${BOOTER_COLOR}[BOOTER]${RESET} `,...args)
}
function Seconds(number) { // auto-deals with numbers
	return number*1000
}
//System Functions
function terminateChild(childProcess) {
    return new Promise((resolve) => {
        if (!child) return resolve();

        childProcess.send({
        	type: "InternalNotifier",
        	value: "Shutdown"
        })

        // Listen for the one-time exit event
        childProcess.once('exit', () => {
            resolve();
        });

        childProcess.kill(); 
        child = null
    });
}
function createChild(file) {
	return new Promise((resolve) => {
		if (child) return resolve();

		child = fork(file, [], { 
    		stdio: ['inherit', 'pipe', 'pipe', 'ipc'] 
  			});

		// Handle standard logs
		child.stdout.on('data', (data) => {
		  const lines = data.toString().trim().split('\n');
		  lines.forEach(line => {
		    console.log(`${SERVER_COLOR}[SERVER]${RESET}: ${line}`);
		  });
		});

		// Handle error logs
		child.stderr.on('data', (data) => {
		  const lines = data.toString().trim().split('\n');
		  lines.forEach(line => {
		    console.error(`${SERVER_COLOR}[SERVER]${RESET} ${ERROR_COLOR}[ERROR]${RESET}: ${line}`);
		  });
		});

		child.on('exit', (code) => {
		  if (code !== 0) {
		    let errored = false
		    process.stdin.pause()
		    try {
		    	terminateChild(child)
		    	child = null
		    } catch(err) {
		    	errored = true
		    	print("Failed to close server:",err)
		    } finally {
		    	process.stdin.resume()
		    	if (!errored) {
		    		print("Successfully closed server.")
		    		print("----")
		    		enterWaitingServerType()
		    	}
		    }
		  }
		});

		child.send({
			type: "Debugging",
			value: Debugging
		})
		child.send({
			type: "ServerIdent",
			value: "child_process1"
		})
	})
}
function ParseServer(value) { // Boots newest version of the software.
	//Get Server from Value
	let Server = Servers[value]
	debugSend(Server)
	//Get Server JS
	let ServerPath = `./EclipseraServer${Server}`
	debugSend(ServerPath)
	//Setup fork
	state = "ServerActive"
	ServerInt = value
	createChild(ServerPath)
}
function enterWaitingServerType() {
	state = "WaitingServerType"
	WaitingResolved = false

	print("Press [i] to select server version")
	print("Auto-booting most recent version in 10 seconds...")

	if (WaitingTimer) clearTimeout(WaitingTimer)

	WaitingTimer = setTimeout(() => {
		if (WaitingResolved||Closing) return

		WaitingResolved = true
		print("No input detected. Booting most recent version.")
		ParseServer(Servers[0])
	}, Seconds(10))
}
function BootSystem() {
	print("Eclipsera Systems V0.1")
	print("Auto-booting...")
	enterWaitingServerType()
}

//Keys
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("utf8")

function normalizeKey(key) {
  return KEYMAP[key] ?? key;
}

const keys = {
	q: () => {
		if (state == "WaitingServerType" || state == "WaitingServerTypeSelfInput") {
			Closing = true
			process.stdin.pause()
    		process.stdin.removeAllListeners("data")
    		if (WaitingTimer) clearTimeout(WaitingTimer)
    		print("Closed.")
		} else if(state == "ServerActive") {
			let errored = false
			process.stdin.pause()
			try {
				terminateChild(child)
				child = null
			} catch(err) {
				errored = true
				print("Failed to close server:",err)
			} finally {
				process.stdin.resume()
				if (!errored) {
					print("Successfully closed server.")
					print("----")
					enterWaitingServerType()
				}
			}
		}
	},
	r: () => {
		if (state == "ServerActive") {
			let errored = false
			try {
				print("Attempting to restart servers...")
				process.stdin.pause()
				terminateChild(child)
				ParseServer(ServerInt)
			} catch(err) {
				errored = true
				print("Failed to restart:",err)
			} finally {
				if (!errored) {
					print("Cleared Restart.")
				}
				process.stdin.resume()
			}
		}
	},
	d: () => {
		print("Changing Debug Mode:",Debugging,">",!Debugging)
		Debugging = !Debugging
		print("Changed Debug Mode:",Debugging)
		if (child !== null) {
			child.send({
				type: "Debugging",
				value: Debugging
			})
		}
	},
	i: () => {
		if (state == "WaitingServerType") {
			WaitingResolved = true
			state = "WaitingServerTypeSelfInput"
			print("Following inputs for server Types:")
			print("")
			print("ARROW RIGHT - Change version downwards")
			print("ARROW LEFT - Change version upwards")
			print("----")
		}
	},
	ENTER: () => {
		if (state == "WaitingServerTypeSelfInput") {
			print("Booting as: ",Servers[ServerInt])
			ParseServer(ServerInt)
		}
	},
	RIGHT: () => {
		if (state == "WaitingServerTypeSelfInput") {
			if (ServerInt+1 <= Servers.length-1) {
				ServerInt+=1
				debugSend(ServerInt+1,Servers.length-1)
				print("Current Selected: ",Servers[ServerInt])
			} else {
				print("Illegal Selection, reverting...")
			}
		}
	},
	LEFT: () => {
		if (state == "WaitingServerTypeSelfInput") {
			if (ServerInt-1 >= 0) {
				ServerInt-=1
				print("Current Selected: ",Servers[ServerInt])
			} else {
				print("Illegal Selection, reverting...")
			}
		}
	}
}

process.stdin.on("data", (key) => {
	let basekey = normalizeKey(key)
	debugSend(basekey+` pressed in state:`,state)
	keys[basekey]?.()
})

BootSystem()

print("A")
