export function normalizeUrl(url) {
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