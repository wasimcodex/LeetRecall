// inject.js (this runs in the page context)
(() => {
  try {
    const code = window.monaco?.editor?.getModels?.()[0]?.getValue?.() || "";
    window.postMessage({ type: "FROM_PAGE_SCRIPT", text: code }, "*");
  } catch (error) {
    window.postMessage({ type: "FROM_PAGE_SCRIPT", text: "" }, "*");
  }
})();
