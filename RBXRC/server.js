const path = require("path");
const fs = require("fs");
const { FILE } = require("dns");
module.exports = {
    ParseHTML: (SubPath) => {
        //Early Registries
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
        console.log(`Hello from RBXRC!  '${SubPath}'`)
        let File
        let IsLoggedIn = false
        let ViewingProfile = false
        let data
        let FileDir = path.join(PUBLIC_DIR, `${SubPath}.html`)
        return new Promise((resolve) => {
            if (!fs.existsSync(FileDir)) {
                return resolve({ Status: 404, HTML: "No File" });
            }

            fs.readFile(FileDir, "utf8", (err, data) => {
                if (err) {
                    return resolve({ Status: 503, HTML: "Error reading file" })
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
                resolve({Status:200,HTML:data})
            })
        })
    }
}
