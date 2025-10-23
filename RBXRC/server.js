const path = require("path");
const fs = require("fs");
module.exports = {
    GetFile: (SubPath) => {
        const prt = path.join(__dirname, "public", SubPath)

        return new Promise((resolve) => {
            if (!fs.existsSync(prt)) {
                return resolve({ Status: 404, HTML: "No File" });
            }
            fs.readFile(prt, "utf8", (err, data) => {
                if (err) {
                    return resolve({ Status: 503, HTML: "Error reading file" })
                }
                return resolve({ Status: 200, HTML: data })
            })
        })
    },
    ParseHTML: (SubPath, query) => {
        //Early Registries
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const PlayerData = {};
        const fragments = {};
        const BadgeData = {};
        const Services = {};
        const ErrorData = {};
        const PUBLIC_DIR = path.join(__dirname, "public");
        const SITE_SOURS = path.join(PUBLIC_DIR, "SiteSources")
        const PLRDAT_SOU = path.join(PUBLIC_DIR, "PlayerSources")
        const BADGES_SOU = path.join(PUBLIC_DIR, "BadgeData")
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

        function CreateProfile(UID, JSONFile) {
            try {
                const fileContents = fs.readFileSync(JSONFile, 'utf8');
                const data = JSON.parse(fileContents)
                if (data.Name && data.CreationDate && PlayerData[UID] === undefined) {
                    console.log(data.SOL ?? 0, data.AMY ?? 0, data.ATH ?? 0)
                    if (Array.isArray(data.Staff)) {
                        console.log(data.Staff)
                        console.log(data.Staff[1])
                    }
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
                    if (Array.isArray(data.Staff) && data.Staff[1] === "Founder" && PlayerData[UID]["ProfileColor"] === undefined) {
                        console.log("10")
                        PlayerData[UID]["ProfileColor"] = "profile-info-fndr"
                    }
                    if (Array.isArray(data.Staff) && data.Staff[1] === "CFounder" && PlayerData[UID]["ProfileColor"] === undefined) {
                        console.log("9")
                        PlayerData[UID]["ProfileColor"] = "profile-info-cfndr"
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
            console.log(`Triggered due to ${UserId}/${name} being triggered`)
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
                let NSTR = Math.floor(number / 100_000) / 10
                if (NSTR.toString().length === 5) {
                    NSTR = Math.floor(number / 1_000_000)
                }
                return NSTR + 'M';
            } else if (number >= 1_000) {
                let NSTR = Math.floor(number / 100) / 10
                if (NSTR.toString().length === 5) {
                    NSTR = Math.floor(number / 1_000)
                }
                return NSTR + 'K';
            } else {
                return number.toString();
            }
        }

        console.log(`Hello from RBXRC!  '${SubPath}'`)
        if (SubPath === "index") {
            SubPath = "index.html"
        }
        let File
        let IsLoggedIn = false
        let ViewingProfile = false
        let data
        let FileDir = path.join(PUBLIC_DIR, `${SubPath}`)
        let extra = {}
        console.log(query)
        if (query !== "") {
            const pairs = query.split("&")
            for (const pair of pairs) {
                const [key, value] = pair.split("=")
                if (key) {
                    extra[key] = value ? decodeURIComponent(value) : true;
                }
            }
        }
        if (SubPath === "profile.html" && (extra["p"] || IsLoggedIn !== false)) {
            ViewingProfile = extra["p"] ? extra["p"] : (extra["UID"] ? extra["UID"] : true)
        }
        return new Promise((resolve) => {
            if (!fs.existsSync(FileDir)) {
                return resolve({ Status: 404, HTML: "No File" });
            }
            if (!IsLoggedIn && ViewingProfile == true) {
                return resolve({ Status: 301, HTML: "Redirect to:index.html" })
            }
            fs.readFile(FileDir, "utf8", (err, data) => {
                if (err) {
                    return resolve({ Status: 503, HTML: "Error reading file" })
                }
                if (ViewingProfile !== true && ViewingProfile !== false) {
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
                resolve({ Status: 200, HTML: data })
            })
        })
    }
}
