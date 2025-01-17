

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "redirect") {
        const celebList = [
             "https://www.instagram.com/cristiano/",
             "https://www.instagram.com/leomessi/",
             "https://www.instagram.com/mahi7781/",
             "https://www.instagram.com/selenagomez/",
             "https://www.instagram.com/justinbieber/",
             "https://www.instagram.com/kingjames/",
             "https://www.instagram.com/therock/",
             "https://www.instagram.com/beyonce",
             "https://www.instagram.com/katyperry",
             "https://www.instagram.com/snoopdogg",
             "https://www.instagram.com/davidbeckham",
             "https://www.instagram.com/aliaabhatt",
             "https://www.instagram.com/dualipa",
             "https://www.instagram.com/priyankachopra",
             "https://www.instagram.com/shraddhakapoor",
             "https://www.instagram.com/vindiesel",
             "https://www.instagram.com/gal_gadot",
             "https://www.instagram.com/chrisbrownofficial"
            ]
        
        const randomIndex = Math.floor(Math.random() * celebList.length);
        const celeb = celebList[randomIndex]
        
        try {
            console.log("celeb", celeb)
            await chrome.storage.sync.set({ startTime: new Date().toISOString() });
            await chrome.tabs.update(sender.tab.id, { url: celeb })
            // setTimeout(() => {
            //     console.log("tabId inside redirect listener in background.js", sender.tab.id)
            //     chrome.tabs.sendMessage(sender.tab.id, { action: "startRedirectTask", tabId: sender.tab.id })
            // }, 8000)

            chrome.webNavigation.onCompleted.addListener(function callback(details) {
                // Check if the completed navigation is for the same tab
                if (details.tabId === sender.tab.id) {
                    console.log("tabId inside redirect listener in background.js", sender.tab.id);

                    // Send message to content script
                    chrome.tabs.sendMessage(sender.tab.id, { action: "startRedirectTask", tabId: sender.tab.id });

                    // Remove the listener after it executes
                    chrome.webNavigation.onCompleted.removeListener(callback);
                }
            }, { url: [{ urlContains: "instagram.com" }] });
        } catch (error) {
            console.log("error in redirect listener in background.js", error)
            await chrome.storage.sync.set({ startTime: new Date().toISOString() });
            await chrome.tabs.update(sender.tab.id, { url: celeb })
            // setTimeout(() => {
            //     console.log("tabId inside redirect listener in background.js", sender.tab.id)
            //     chrome.tabs.sendMessage(sender.tab.id, { action: "startRedirectTask", tabId: sender.tab.id })
            // }, 8000)
            chrome.webNavigation.onCompleted.addListener(function callback(details) {
                if (details.tabId === sender.tab.id) {
                    console.log("tabId inside redirect listener in background.js", sender.tab.id);

                    chrome.tabs.sendMessage(sender.tab.id, { action: "startRedirectTask", tabId: sender.tab.id });
                    chrome.webNavigation.onCompleted.removeListener(callback);
                }
            }, { url: [{ urlContains: "instagram.com" }] })
        }
        
    } else if (message.action === "restartFillCheckBox") {
        try {
            await chrome.tabs.update(sender.tab.id, { url: `https://www.instagram.com/accounts/close_friends/` })
            setTimeout(() => {
                chrome.tabs.sendMessage(sender.tab.id, { action: "fillCheckBox" })
            }, 6000)
            // chrome.webNavigation.onCompleted.addListener(function callback(details) {
            //     if (details.tabId === sender.tab.id) {
            //         console.log("tabId inside redirect listener in background.js", sender.tab.id);

            //         chrome.tabs.sendMessage(sender.tab.id, { action: "fillCheckBox", tabId: sender.tab.id })
            //         chrome.webNavigation.onCompleted.removeListener(callback);
            //     }
            // }, { url: [{ urlContains: "instagram.com" }] });
        } catch (error) {
            console.log("error in restartFillCheckBox listener in background.js", error)
            await chrome.tabs.update(sender.tab.id, { url: `https://www.instagram.com/accounts/close_friends/` })
            setTimeout(() => {
                chrome.tabs.sendMessage(sender.tab.id, { action: "fillCheckBox" })
            }, 6000)
        }
        
    }
});

// Function to check internet connectivity
function checkInternetConnection() {
    console.log("Checking internet connection...")
    fetch("https://www.google.com", { method: "HEAD", mode: "no-cors" })
        .then(async () => {
            console.log("Internet is reachable.")
            const { noInternet, tabId } = await chrome.storage.sync.get(["noInternet", "tabId"])
            if (noInternet === true) {
                await chrome.tabs.update(tabId, { url: `https://www.instagram.com/accounts/close_friends/` })
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { action: "fillCheckBox" })
                }, 8000)
            }
            await chrome.storage.sync.set({ noInternet: false })
        })
        .catch(async () => {
            console.log("No internet connection.")
            await chrome.storage.sync.set({ noInternet: true });
        });
}

// Create the alarm
chrome.alarms.create("checkInternet", { periodInMinutes: 0.33 })
console.log("Alarm 'checkInternet' created.")

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm triggered:", alarm.name)
    if (alarm.name === "checkInternet") {
        checkInternetConnection()
    }
});
