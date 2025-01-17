const base_url = "http://localhost:5000/api/v1"
function populateErrorDiv(errorReason, divId) {
    const requiredDiv = document.getElementById(divId)
    console.log("requiredDiv", requiredDiv)

    if (document.getElementById("errorLabel") === null) {
        const errorLabel = document.createElement("label")
        errorLabel.innerHTML = errorReason
        errorLabel.id = "errorLabel"
        errorLabel.style = "color:red; font-weight: bold;"
        requiredDiv.appendChild(errorLabel)
        // console.log("inside a")
    }
    else if (document.getElementById("errorLabel") !== null) {
        // console.log("inside b")
        const errorLabel = document.getElementById("errorLabel")
        errorLabel.style = "display:block"
        errorLabel.innerHTML = errorReason
    }
}
async function runAll(action) {
    if (action === "fillCheckBox") fillCheckBox()
    else if (action === "alertDailyLimitReached") alertDailyLimitReached()
    else if (action === "alertListExhauted") alertListExhauted()
    else if (action === "redirect") redirectTask()
}
function hatana() {
    console.log("inside hatana")
    // removeDivs()
}
window.addEventListener("load", async () => {
    const { aToken, userEmail } = await chrome.storage.sync.get(["aToken", "userEmail"])
    console.log("Value is set to " + aToken)
    const loginToken = aToken

    if (loginToken === undefined) {
        document.getElementById("profileDiv").setAttribute("style", "display: none")
        document.getElementById("loginDiv").setAttribute("style", "display: block")
        console.log("inside this 1")
    } else {
        document.getElementById("loginDiv").setAttribute("style", "display: none")
        document.getElementById("profileDiv").setAttribute("style", "display: block")
        document.getElementById("userEmail").textContent = userEmail

        const response = await fetch(`${base_url}/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${loginToken}`,
                "Content-Type": "application/json"
            },
        })
        if (!response.ok) {
            // const instaSettingsDiv = document.getElementById("profileDiv")
            const errorData = await response.json()
            populateErrorDiv(errorData.reason, "profileDiv")
            return
        }
        const result = await response.json()
        if (result.user.totalFreindsAdded === 0) {
            document.getElementById("infoDiv").setAttribute("style", "display: none")
        }
        const freindsLeftToBeAdded = result.user.totalFreindsAdded - result.user.totalCloseFreindsMarked
        document.getElementById("notification").textContent = `${freindsLeftToBeAdded} friends left to be marked`
        await chrome.storage.sync.set({ freindsLeftToBeAdded: freindsLeftToBeAdded, instaUsername: result.user.instaUsername })
        // await chrome.storage.sync.set({ index: null })
        console.log("inside this 2", result.user.instaUsername)
    }
    await chrome.storage.local.set({ closeFreindsAdded: [] })

    const login = document.getElementById("login")
    login.addEventListener("click", async () => {
        const errorSpan = document.getElementById('error')

        const handle = document.getElementById("email").value
        const password = document.getElementById("pwd").value

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(handle)) {
            errorSpan.style.display = 'inline'
            return true
        } else {
            errorSpan.style.display = 'none'
        }

        const spinner = document.getElementById('spinnerId')
        spinner.style.display = 'flex'

        const loginData = {
            handle,
            password
        }
        const response = await fetch(`${base_url}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(loginData)
        })
        spinner.style.display = 'none'
        if (!response.ok) {
            const errorData = await response.json()
            // const loginDiv = document.getElementById("loginDiv")
            populateErrorDiv(errorData.reason, "loginDiv")
            return
            // throw new Error("Error Something went wrong");
        }
        const data = await response.json()
        if (data !== undefined) {
            const loginToken = data.token
            await chrome.storage.sync.set({ aToken: loginToken, userEmail: handle, instaUsername: data.instaUsername })
            document.getElementById("loginDiv").setAttribute("style", "display: none")
            document.getElementById("profileDiv").setAttribute("style", "display: block")
            document.getElementById("userEmail").textContent = handle
        }

    })

    const logout = document.getElementById("logoutBtn")
    logout.addEventListener("click", () => {
        chrome.storage.sync.clear().then(async () => {
            document.getElementById("profileDiv").setAttribute("style", "display: none")
            document.getElementById("loginDiv").setAttribute("style", "display: block")

            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: hatana
            })
        })
    })

    const uploadButton = document.getElementById("uploadButton")
    uploadButton.addEventListener("click", async function () {
        document.getElementById("profileDiv").setAttribute("style", "display: block")
        const { aToken } = await chrome.storage.sync.get(["aToken"])
        chrome.tabs.create({ url: `https://insta-tool.surge.sh/users?token=${aToken}` })
    })

    document.getElementById("submitData").addEventListener("click", async () => {
        try {
            const startTime = new Date().toISOString();
            chrome.storage.sync.set({ startTime: startTime })
            
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            await chrome.storage.sync.set({ markedFreinds: 0 })
            await chrome.storage.sync.set({ tabId: tab.id })
            if (tab.url === "https://www.instagram.com/accounts/close_friends/") {  
                chrome.storage.sync.get(["aToken"]).then(async (result) => {
                    const tabId = tab.id
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: runAll,
                        args: ["fillCheckBox"]
                    })
                })
            } else {
                await chrome.tabs.update(tab.id, { url: 'https://www.instagram.com/accounts/close_friends/' })
                setTimeout(async () => {
                    const [currTab] = await chrome.tabs.query({ active: true, currentWindow: true })
                    if (currTab.url !== "https://www.instagram.com/accounts/close_friends/") {
                        alert("Please login to your instagram account and then click submit.")
                    } else {
                        chrome.storage.sync.get(["aToken"]).then(async (result) => {
                            await chrome.scripting.executeScript({
                                target: { tabId: currTab.id },
                                func: runAll,
                                args: [ "fillCheckBox"]
                            })
                        })
                    }
                }, 4000)
            }
        } catch (error) {
            console.error("Error at event listener for 'submitData'", error);
            // document.getElementById("status").textContent = "An error occurred while uploading the file.";
        }
    })

    document.getElementById("stopExtension").addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        await chrome.tabs.update(tab.id, { url: "https://www.instagram.com/accounts/close_friends/" })
    })
})

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.action === "addNextFreind") {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: runAll,
            args: [message.closeFreind, "fillCheckBox"]
        })
    }
})

