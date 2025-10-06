import { addDoc, collection, db, query, where, getDocs } from "./firebase.js";
import { updateDoc } from "firebase/firestore";
import { normalizeUrl } from "./utils.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "saveProblem") {
        chrome.storage.local.get("uid", async ({ uid }) => {
            if (!uid) {
                console.error("No user ID found. User might not be logged in.");
                sendResponse({ success: false, error: "User not logged in." });
                return;
            }

            try {
                const collectionRef = collection(db, "users", uid, "problems");
                const q = query(collectionRef, where("url", "==", normalizeUrl(message.data.url)));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    await updateDoc(doc.ref, { ...message.data, lastUpdated: new Date().toISOString() });
                    sendResponse({ success: true });
                    return;
                } else {
                    await addDoc(collection(db, "users", uid, "problems"), { ...message.data, savedAt: new Date().toISOString() });
                    sendResponse({ success: true });
                    return;
                }
            } catch (err) {
                console.error("Error saving problem:", err);
                sendResponse({ success: false, error: "Failed to save problem." });
            }
        });
        return true; // keep channel open for async
    }

    if (message.action === "checkIfSaved")  {
        chrome.storage.local.get("uid", async ({ uid }) => {
            if (!uid) {
                console.error("No user ID found. User might not be logged in.");
                sendResponse({ saved: false, error: "User not logged in." });
                return;
            }

            try {
                const problemsRef = collection(db, "users", uid, "problems");
                const q = query(problemsRef, where("url", "==", normalizeUrl(message.url)));
                const querySnapshot = await getDocs(q);
                sendResponse({ saved: !querySnapshot.empty });
            } catch (err) {
                console.error("Error checking if problem is saved:", err);
                sendResponse({ saved: false, error: "Failed to check problem." });
            }
        });
        return true; // keep channel open for async
    }

    if (message.action === "updateProblemCode") {
        chrome.storage.local.get("uid", async ({ uid }) => {
            if (!uid) {
                console.error("No user ID found. User might not be logged in.");
                sendResponse({ success: false, error: "User not logged in." });
                return;
            }

            try {
                const problemsRef = collection(db, "users", uid, "problems");
                const q = query(problemsRef, where("url", "==", message.url));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    sendResponse({ success: false, error: "Problem not found." });
                    return;
                }

                const doc= querySnapshot.docs[0];
                await updateDoc(doc.ref, { code: message.code, lastUpdated: new Date().toISOString() });
                sendResponse({ success: true });
            } catch (err) {
                console.error("Error updating problem code:", err);
                sendResponse({ success: false, error: "Failed to update code." });
            }
        });
        return true; // keep channel open for async
    }
});

console.log("Background service worker started ✅");
