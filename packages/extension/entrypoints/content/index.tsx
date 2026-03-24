import ReactDOM from "react-dom/client"
import App from "./app"
import "./style.css"
import type { FormField, ClickableElement, PageContext } from "@/lib/types"

// Unique ID counter for elements without good selectors
let elementIdCounter = 0

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "webagent-sidebar",
      position: "overlay",
      anchor: "body",
      append: "last",
      onMount(container) {
        const wrapper = document.createElement("div")
        wrapper.id = "webagent-root"
        container.append(wrapper)

        const root = ReactDOM.createRoot(wrapper)
        root.render(
          <App
            getPageContext={getPageContext}
            handleToolCall={handleToolCall}
          />
        )
        return root
      },
      onRemove(root) {
        root?.unmount()
      },
    })

    ui.mount()

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "TOGGLE_SIDEBAR") {
        window.dispatchEvent(new CustomEvent("webagent:toggle"))
      }
    })
  },
})

// ---------------------------------------------------------------------------
// Page context (scraped fresh each message)
// ---------------------------------------------------------------------------
function getPageContext(): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    text: getPageText(),
    fields: getFormFields(),
    clickables: getClickableElements(),
  }
}

function getPageText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll("script, style, noscript, svg, [hidden], [aria-hidden='true']").forEach((el) => el.remove())
  clone.querySelectorAll("[id*='webagent']").forEach((el) => el.remove())
  const text = clone.innerText || clone.textContent || ""
  return text.replace(/\s+/g, " ").trim()
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
function getFormFields(): FormField[] {
  const fillableSelectors = [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'input[type="tel"]',
    'input[type="number"]',
    'input[type="date"]',
    'input[type="url"]',
    'input[type="search"]',
    "input:not([type])",
    "textarea",
    "select",
  ]

  const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    fillableSelectors.join(", ")
  )

  return Array.from(elements).map((el) => ({
    selector: buildSelector(el),
    tagName: el.tagName.toLowerCase(),
    type: el instanceof HTMLSelectElement ? "select" : (el as HTMLInputElement).type || "text",
    name: el.name || "",
    label: getFieldLabel(el),
    placeholder: (el as HTMLInputElement).placeholder || "",
    options: el instanceof HTMLSelectElement
      ? Array.from(el.options).map((o) => o.text)
      : undefined,
    value: el.value || "",
    required: el.required,
  }))
}

// ---------------------------------------------------------------------------
// Clickable elements
// ---------------------------------------------------------------------------
function getClickableElements(): ClickableElement[] {
  const clickableSelectors = [
    "button",
    "a[href]",
    'input[type="submit"]',
    'input[type="button"]',
    'input[type="reset"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    "[role='button']",
    "[role='link']",
    "[role='tab']",
    "[role='menuitem']",
    "[role='radio']",
    "[role='checkbox']",
    "[role='option']",
    "[onclick]",
  ]

  const elements = document.querySelectorAll<HTMLElement>(
    clickableSelectors.join(", ")
  )

  return Array.from(elements)
    .filter((el) => {
      if (el.offsetParent === null && el.style.display !== "contents") return false
      if (el.closest("[id*='webagent']")) return false
      return true
    })
    .map((el) => ({
      selector: buildSelector(el),
      tagName: el.tagName.toLowerCase(),
      type: (el as HTMLInputElement).type || "",
      text: (el.textContent || "").trim().slice(0, 80),
      value: (el as HTMLInputElement).value || el.getAttribute("data-value") || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      role: el.getAttribute("role") || "",
    }))
    .slice(0, 100) // Cap to prevent huge payloads
}

// ---------------------------------------------------------------------------
// Label & selector helpers
// ---------------------------------------------------------------------------
function getFieldLabel(el: HTMLElement): string {
  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)
    if (label) return label.textContent?.trim() || ""
  }
  const parent = el.closest("label")
  if (parent) {
    const text = parent.textContent?.replace(el.textContent || "", "").trim()
    if (text) return text
  }
  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel
  return (el as HTMLInputElement).name || (el as HTMLInputElement).placeholder || ""
}

function buildSelector(el: HTMLElement): string {
  // 1. Use ID if available
  if (el.id) return `#${CSS.escape(el.id)}`

  // 2. For radio/checkbox inputs, use name+value to make unique
  if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox") && el.name) {
    const name = CSS.escape(el.name)
    const value = CSS.escape(el.value)
    return `input[name="${name}"][value="${value}"]`
  }

  // 3. For other named elements, check if name is unique
  if (el.getAttribute("name")) {
    const tag = el.tagName.toLowerCase()
    const name = CSS.escape(el.getAttribute("name")!)
    const selector = `${tag}[name="${name}"]`
    // Only use name selector if it uniquely identifies this element
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  // 4. Assign a data attribute for stable, unique selection
  if (!el.dataset.webagentId) {
    el.dataset.webagentId = String(++elementIdCounter)
  }
  return `[data-webagent-id="${el.dataset.webagentId}"]`
}

// ---------------------------------------------------------------------------
// Tool handlers — called from ChatPanel via onToolCall
// ---------------------------------------------------------------------------
export type ToolCallHandler = (toolName: string, input: Record<string, unknown>) => string

function handleToolCall(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "fill_fields":
      return handleFillFields(input as { fills: Array<{ selector: string; value: string; label: string }> })
    case "click_element":
      return handleClickElement(input as { selector: string; description: string })
    case "select_option":
      return handleSelectOption(input as { selector: string; value: string; label: string })
    case "read_element":
      return handleReadElement(input as { selector: string; purpose: string })
    default:
      return `Unknown tool: ${toolName}`
  }
}

function handleFillFields(input: { fills: Array<{ selector: string; value: string; label: string }> }): string {
  console.log("[WebAgent] handleFillFields called:", input)
  const results: string[] = []
  for (const { selector, value, label } of input.fills) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)
    if (!el) {
      console.warn("[WebAgent] Element not found:", selector)
      results.push(`${label}: element not found`)
      continue
    }

    // Focus the element first
    el.focus()

    // Use the right native setter based on element type
    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    if (nativeSetter) {
      nativeSetter.call(el, value)
    } else {
      el.value = value
    }

    // Dispatch events that frameworks listen for
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
    el.dispatchEvent(new Event("blur", { bubbles: true }))

    console.log("[WebAgent] Filled:", selector, "→", value)
    results.push(`${label}: filled with "${value}"`)
  }
  return results.join("; ")
}

function handleClickElement(input: { selector: string; description: string }): string {
  const el = document.querySelector<HTMLElement>(input.selector)
  if (!el) return `Element not found: ${input.selector}`

  // For checkboxes/radios, toggle checked state
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    el.click()
    return `${input.description}: ${el.checked ? "checked" : "unchecked"}`
  }

  el.click()
  return `Clicked: ${input.description}`
}

function handleSelectOption(input: { selector: string; value: string; label: string }): string {
  const el = document.querySelector<HTMLSelectElement>(input.selector)
  if (!el) return `Select element not found: ${input.selector}`
  if (!(el instanceof HTMLSelectElement)) return `Element is not a <select>: ${input.selector}`

  // Try matching by option text first, then by value
  const option = Array.from(el.options).find(
    (o) => o.text.toLowerCase() === input.value.toLowerCase() || o.value.toLowerCase() === input.value.toLowerCase()
  )
  if (!option) return `Option "${input.value}" not found in ${input.label}`

  el.value = option.value
  el.dispatchEvent(new Event("change", { bubbles: true }))
  return `Selected "${option.text}" in ${input.label}`
}

function handleReadElement(input: { selector: string; purpose: string }): string {
  const el = document.querySelector<HTMLElement>(input.selector)
  if (!el) return `Element not found: ${input.selector}`

  const text = el.innerText?.trim() || el.textContent?.trim() || ""
  const value = (el as HTMLInputElement).value || ""
  const checked = (el as HTMLInputElement).checked

  const parts: string[] = []
  if (text) parts.push(`text: "${text.slice(0, 500)}"`)
  if (value) parts.push(`value: "${value}"`)
  if (typeof checked === "boolean" && (el as HTMLInputElement).type) parts.push(`checked: ${checked}`)

  return parts.length > 0 ? parts.join(", ") : "Element exists but has no visible content"
}
