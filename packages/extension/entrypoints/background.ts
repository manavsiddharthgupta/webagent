export default defineBackground(() => {
  // Toggle sidebar when extension icon is clicked
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      try {
        await browser.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" })
      } catch {
        // Content script not loaded (chrome://, edge://, etc.)
      }
    }
  })
})
