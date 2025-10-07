function scrapeProblem() {
  return {
    title: getTitle(),
    url: normalizeUrl(window.location.href),
    description: getDescription(),
    difficulty: getDifficulty(),
    tags: getTags(),
    lang: getSelectedLanguage() || "Unknown",
    code: getCodeFromEditor(),
    rememberedCount: 0,
    forgotCount: 0,
    lastReviewedAt: new Date().toISOString(),
  };
}

function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/problems\/([^\/]+)/);
    if (match && match[1]) {
      return `https://leetcode.com/problems/${match[1]}/`;
    }
    return url; // return original if no match
  } catch {
    return url; // return original if invalid URL
  }
}

/** Get page title */
function getTitle() {
  return document.querySelector("title")?.innerText || "Unknown";
}

/** Get meta description (if available) */
function getDescription() {
  return document.querySelector("meta[name='description']")?.content || "";
}

/** Extract difficulty (Easy/Medium/Hard) */
function getDifficulty() {
  const el = document.querySelector("[class*='text-difficulty']");
  return el?.innerText.trim() || "Unknown";
}

/** Extract problem tags (from links like /tag/...) */
function getTags() {
  const links = document.querySelectorAll("a[href^='/tag/']");
  return Array.from(links).map((link) => link.innerText.trim());
}

/** Extract selected language from the editor */
function getSelectedLanguage() {
  // Locate the "Auto" button
  const autoButton = Array.from(document.querySelectorAll("button")).find(
    (btn) => btn.textContent.trim() === "Auto"
  );

  if (!autoButton) return null;

  // Find the wrapper that contains both language & auto buttons
  const wrapper = autoButton.closest(".flex.h-full.flex-nowrap.items-center");
  if (!wrapper) return null;

  // Language button is inside the first child div
  const langButton = wrapper.querySelector("div.h-full > button");
  if (!langButton) return null;

  return langButton.childNodes[0]?.textContent.trim() || null;
}

/** Extract code text from Monaco editor */
function getCodeFromEditor() {
  const lines = document.querySelectorAll(".view-lines .view-line");

  // Map each line with its position
  const sorted = Array.from(lines).map((line) => {
    const top = parseInt(line.style.top.replace("px", ""), 10);
    return { top, text: line.innerText };
  });

  // Sort visually by "top"
  sorted.sort((a, b) => a.top - b.top);

  // Join into final code block
  return sorted.map((line) => line.text).join("\n");
}

function injectSaveButton(isSaved = false) {
  const existingBtn = document.getElementById("lc-save-btn");
  if (existingBtn) {
    existingBtn.remove();
  }

  const toolbar = document.querySelector(".h-full.py-2");
  if (!toolbar) {
    console.warn("Toolbar not found, cannot inject Save button.");
    return;
  }

  const actionBtnGrp = toolbar.children[0];

  const saveBtn = document.createElement("button");
  saveBtn.id = "lc-save-btn";
  saveBtn.title = isSaved ? "Update Code" : "Save Problem";

  Object.assign(saveBtn.style, {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "rgba(0,0,0,0.05)", // light grey
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  });

  // Hover effect
  saveBtn.addEventListener("mouseenter", () => {
    saveBtn.style.backgroundColor = "rgba(0,0,0,0.1)";
  });
  saveBtn.addEventListener("mouseleave", () => {
    saveBtn.style.backgroundColor = "rgba(0,0,0,0.05)";
  });

  // Default save (💾 icon)
  saveBtn.innerHTML = isSaved ? getSavedIcon() : getSaveIcon();

  saveBtn.addEventListener("click", async () => {
    try {
      if (isSaved) {
        const code = getCodeFromEditor();
        chrome.runtime.sendMessage(
          {
            action: "updateProblemCode",
            url: normalizeUrl(window.location.href),
            code,
          },
          (response) => {
            if (response?.success) {
              saveBtn.innerHTML = getCheckIcon("green");
              setTimeout(() => {
                saveBtn.innerHTML = getSavedIcon();
              }, 2000);
            } else {
              throw new Error(response?.error || "Unknown error");
            }
          }
        );
      } else {
        const problemData = scrapeProblem();

        chrome.runtime.sendMessage(
          { action: "saveProblem", data: problemData },
          (response) => {
            if (response?.success) {
              saveBtn.innerHTML = getCheckIcon("green");
              setTimeout(() => {
                saveBtn.innerHTML = getSavedIcon();
              }, 2000);
            }
          }
        );
      }
    } catch (err) {
      console.error("Error during save operation:", err);
      saveBtn.innerHTML = getErrorIcon();
      saveBtn.textContent = "❌ Error";
      setTimeout(() => {
        saveBtn.innerHTML = getSaveIcon();
        saveBtn.textContent = "";
      }, 2000);
    }
  });
  actionBtnGrp.appendChild(saveBtn);
}

// --- Icon helpers ---
function getSaveIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
          stroke="#4B5563" width="18" height="18">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z"/>
  </svg>`;
}
function getSavedIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="#33a348" viewBox="0 0 24 24"
          width="18" height="18">
    <path d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z"/>
  </svg>`;
}
function getCheckIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          stroke="#33a348" width="18" height="18">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M5 13l4 4L19 7"/>
  </svg>`;
}
function getErrorIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          stroke="red" width="18" height="18">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "leetCodePageLoaded") {
    const problemUrl = message.url;

    console.log("LeetCode problem page loaded:", problemUrl);

    chrome.runtime.sendMessage(
      { action: "checkIfSaved", url: problemUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          return;
        }
        injectSaveButton(response?.saved || false);
      }
    );
  }
});

console.log("✅ Content script loaded on", window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProblem") {
    const onLeetCodeProblem =
      window.location.hostname === "leetcode.com" &&
      window.location.pathname.startsWith("/problems/");
    if (!onLeetCodeProblem) {
      sendResponse({ error: "Not on a LeetCode problem page." });
      return;
    }

    try {
      const problemData = scrapeProblem();
      sendResponse({ data: problemData });
    } catch (error) {
      sendResponse({ error: "Failed to scrape problem data." });
    }

    return true; // keep the message channel open for async response
  }
});
