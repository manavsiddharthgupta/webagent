export default defineBackground(() => {
  console.log("WebAgent background loaded", { id: browser.runtime.id })
})
