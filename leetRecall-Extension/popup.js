import { auth, db, GoogleAuthProvider, signInWithPopup, collection, addDoc } from "./firebase.js";
import { onAuthStateChanged, signInWithCredential } from "./firebase_sdk/firebase-auth.js";

const client_id = 'you_client_id_here.apps.googleusercontent.com'; // Replace with your actual client ID

const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

let currentUser = null;

signInBtn.addEventListener("click", async () => {
  try {
    const token = await signInWithGoogle();
    const credential = GoogleAuthProvider.credential(null, token);
    const result = await signInWithCredential(auth, credential);

    currentUser = result.user;
    console.log("User signed in:", currentUser);

    chrome.storage.local.set({ uid: currentUser.uid });

    showLoggedInState(currentUser);
  } catch (err) {
    console.error("Login failed", err);
  }
});

signOutBtn.addEventListener("click", async () => {
    try {
        await auth.signOut();
        currentUser = null;
        chrome.storage.local.remove("uid");
        showLoggedOutState();
        console.log("User signed out");
    } catch (err) {
        console.error("Sign out failed", err);
    }
});

saveBtn.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please sign in first.");
        return;
    }

    saveBtn.disabled = true;
    setStatus("Scraping problem...", "loading");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
        setStatus("No active tab found", "error");
        saveBtn.disabled = false;
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.href
    }, async (injectionResults) => {
        const url = injectionResults[0].result;

        if (!url.includes("leetcode.com/problems/")) {
            alert("Please navigate to a LeetCode problem page to save.");
            setStatus("Not a LeetCode problem page", "error");
            saveBtn.disabled = false;
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: "scrapeProblem" }, async (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error communicating with content script:", chrome.runtime.lastError);
                alert("Failed to communicate with the content script.");
                setStatus("Communication error", "error");
                saveBtn.disabled = false;
                return;
            }
            if (response.error) {
                alert(response.error);
                setStatus(response.error, "error");
                saveBtn.disabled = false;
                return;
            }
            const problemData = {
                ...response,
                savedAt: new Date().toISOString()
            };

            try {
                await addDoc(collection(db, "users", currentUser.uid, "problems"), problemData);
                alert("Problem saved successfully!");
            } catch (err) {
                console.error("Error saving problem:", err);
                alert("Failed to save problem. Please try again.");
            } finally {
                setStatus("");
                saveBtn.disabled = false;
            }
        });
    });
});

function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = type; // e.g., "error", "success"
}

function signInWithGoogle() {
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
            {
                url: `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(client_id)}&response_type=token&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}&scope=${encodeURIComponent('email profile')}`,
                interactive: true
            },
            async (redirectUrl) => {
                if (chrome.runtime.lastError || !redirectUrl) {
                    return reject(new Error(chrome.runtime.lastError?.message || 'No redirect URL'));
                }

                const url = new URL(redirectUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const accessToken = params.get('access_token');

                if (accessToken) {
                    resolve(accessToken);
                }
                if (!accessToken) {
                    return reject(new Error('No access token found'));
                }
            }
        );
    });
}

function showLoggedInState(user) {
    document.getElementById("loader").style.display = "none";
    document.getElementById("logged-out-view").style.display = "none";
    document.getElementById("logged-in-view").style.display = "block";

    document.getElementById("user-name").innerText = user.displayName || "User";
    document.getElementById("user-email").innerText = user.email || "";
    if (user.photoURL) {
        document.getElementById("user-photo").src = user.photoURL;
        document.getElementById("user-photo").style.display = "block";
    }
}

function showLoggedOutState() {
    document.getElementById("loader").style.display = "none";
    document.getElementById("logged-out-view").style.display = "block";
    document.getElementById("logged-in-view").style.display = "none";

    document.getElementById("user-name").innerText = "";
    document.getElementById("user-email").innerText = "";
    document.getElementById("user-photo").src = "";
}


onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        chrome.storage.local.set({ uid: currentUser.uid });
        showLoggedInState(user);
    } else {
        currentUser = null;
        chrome.storage.local.remove("uid");
        showLoggedOutState();
    }
});
