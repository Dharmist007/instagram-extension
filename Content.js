console.log("content.js is running");
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "startRedirectTask") {
        console.log("received redirect task in content.js", message.tabId)
        redirectTask(message.tabId)
        sendResponse({ success: true })
    } else if (message.action === "fillCheckBox") {
        fillCheckBox()
    }
})

async function fillCheckBox() {
    try {
        const { aToken, markedFreinds, startTime } = await chrome.storage.sync.get(["aToken", "markedFreinds", "startTime"])

        const storedTimestamp = new Date(startTime).getTime()
        const currentTimestamp = Date.now()
    
        const timeDifference = currentTimestamp - storedTimestamp
        // Check if the difference is greater than 30 minutes
        if (timeDifference > 30 * 60 * 1000) {
            await chrome.runtime.sendMessage({ action: 'redirect' })
            return
        } else {
            const responseGetFreind = await fetch(`${base_url}/get/freind`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${aToken}`,
                    "Content-Type": "application/json"
                },
            })
            if (!responseGetFreind.ok) {
                // const instaSettingsDiv = document.getElementById("profileDiv")
                const errorData = await responseGetFreind.json();
                // populateErrorDiv(errorData.reason, "profileDiv")
                console.log("Error while fetching the freinds list! --> '/get/freind'", errorData)
                if (errorData.listExhausted === true) {
                    alert("All friends in you list are marked")
                } else if (errorData.reason === "You have reached the daily limit for today") alert(errorData.reason)
                return
                // document.getElementById("status").textContent = "Error while uploading the file!";
            }
            const result = await responseGetFreind.json()
            const closeFreindsToBeAdded = result.instausersname
            console.log("inside fillCheckBox, **** closeFreindsToBeAdded", closeFreindsToBeAdded)
    
            const closeFreindBlock = document.querySelector('[role="main"]');
            const search = closeFreindBlock.children[0].children[2].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[1].children[0].children[0].children[1];
    
            // const mainDiv = closeFreindBlock.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
            // const secDiv = mainDiv.children[1].children[0].children[0].children[0].children[0].children[1];
            // const secDivChildren = secDiv.childNodes;

            const profileNameDiv = closeFreindBlock.parentNode.parentNode.parentNode.children[1].children[0].children[0].children[0].children[0].children[1].children[7]
            const hrefLink = profileNameDiv.querySelectorAll("a")[0].href
            const profileName = hrefLink.split("instagram.com/")[1].replace("/", "")
            const { instaUsername } = await chrome.storage.sync.get(["instaUsername"])
            await chrome.storage.sync.set({ profileName: profileName })
            console.log("instaUsername", instaUsername)
            console.log("profileName", profileName)
            console.log("instaUsername !== profileName", instaUsername !== profileName)
    
            if (instaUsername !== profileName) {
                alert("You are not authorized to add close freinds to this profile")
                return
            }
            search.value = "";
            search.setRangeText(closeFreindsToBeAdded, search.selectionStart, search.selectionEnd, "end");
            search.dispatchEvent(new Event('input', { bubbles: true }));
    
            await new Promise((resolve) => {
                setTimeout(() => resolve(), 3000);
            });
    
            const waitForElement = (resolve) => {
                console.log("Checking if the element is loaded...");
                // let person = closeFreindBlock.children[0].children[0].children[0].children[0].children[1].children[1].children[0]
                let person = closeFreindBlock.children[0].children[2].children[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[1].children[1].children[0]
                if (person !== undefined) {
                    resolve(person); // Element is found, resolve the promise.
                } else {
                    setTimeout(() => waitForElement(resolve), 500); // Retry after 500ms.
                }
            };
    
            // Wait for the person element to load.
            const person = await new Promise((resolve) => waitForElement(resolve));
    
            if (person.innerText !== "No users found.") {
                const isAlreadyMarked = person.children[0].childElementCount > 0;
                let checkbox
                if (isAlreadyMarked) {
                    // checkbox = person.children[0].children[0].children[0].children[1].children[0].children[0].children[0]
                    checkbox = person.children[0].children[0].children[0].children[1].children[0].children[0].children[0]
                } else {
                    // checkbox = person.children[1].children[0].children[0].children[0].children[1].children[0].children[0].children[0]
                    checkbox = person.children[1].children[0].children[0].children[0].children[1].children[0].children[0].children[0]
                }
    
                const bgColor = window.getComputedStyle(checkbox).backgroundColor;
    
                if (bgColor !== 'rgb(0, 149, 246)') {
                    checkbox.click();
                }
    
                // chrome.runtime.sendMessage({ action: 'closeFreindAdded', closeFreind: closeFreindsToBeAdded });
    
                const body = { closeFreindAdded: closeFreindsToBeAdded, profileName }
    
                const response = await fetch(`${base_url}/closefreind/added`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${aToken}`
                    },
                    body: JSON.stringify(body)
                })
    
                if (!response.ok) {
                    const errorData = await response.json()
                    console.log("errorData.reason", errorData.reason)
                    // populateErrorDiv(errorData.reason, "profileDiv")
                    // return
                } else {
                    const newMarkedFreindsCount = markedFreinds + 1
                    await chrome.storage.sync.set({ markedFreinds: newMarkedFreindsCount })
                    console.log("newMarkedFreindsCounte ===", newMarkedFreindsCount);
                }
            } else {
                const body = { closeFreind: closeFreindsToBeAdded }
                const response = await fetch(`${base_url}/closefreind/not/found`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${aToken}`
                    },
                    body: JSON.stringify(body)
                })
                if (!response.ok) {
                    const errorData = await response.json()
                    console.log("errorData.reason", errorData.reason)
                    // populateErrorDiv(errorData.reason, "profileDiv")
                    // return
                }
            }
            fillCheckBox()
        }
    } catch (error) {
        console.log("error in fillCheckBox", error)
        fillCheckBox()
    }
}
async function redirectTask(tabId) {
    try {
        console.log("************ inside redirect task **************")

        // window.onload = async() => {
        // console.log("Page fully loaded, including resources");
        await new Promise((resolve) => {
            setTimeout(() => resolve(), 3000);
        })
        
        const waitForElement = (resolve) => {
            console.log("Checking if the element is loaded...");
            const post = document.querySelector('[role="main"]').children[0].children[2].children[0].children[0].children[0].children[0]

            if (post) {
                resolve(post); // Element is found, resolve the promise.
            } else {
                setTimeout(() => waitForElement(resolve), 500); // Retry after 500ms.
            }
        };

        const firstPost = await new Promise((resolve) => waitForElement(resolve))
        firstPost.click()

        await new Promise((resolve) => {
            setTimeout(() => resolve(), 2000);
        })

        const waitForElement2 = (resolve) => {
            console.log("Checking if the element is loaded...");
            let firstPostModal = document.querySelector('[role="dialog"]').children[0].children[1].children[0].children[0].children[0]

            if (firstPostModal !== undefined) {
                resolve(firstPostModal); // Element is found, resolve the promise.
            } else {
                setTimeout(() => waitForElement2(resolve), 500); // Retry after 500ms.
            }
        };
        const lovesignmodal = await new Promise((resolve) => waitForElement2(resolve))

        lovesignmodal.children[1].children[0].children[0].children[1].children[0].children[0].children[0].children[0].children[0].click()

        await chrome.runtime.sendMessage({ action: 'restartFillCheckBox' })

    } catch (error) {
        console.log("Error in redirectTask", error)
        await chrome.runtime.sendMessage({ action: 'restartFillCheckBox' })
    }
}








