export interface FormField {
  selector: string
  tagName: string
  type: string
  name: string
  label: string
  placeholder: string
  options?: string[]
  value: string
  required: boolean
}

export interface ClickableElement {
  selector: string
  tagName: string
  type: string
  text: string
  value: string
  ariaLabel: string
  role: string
}

export interface PageContext {
  url: string
  title: string
  text: string
  fields: FormField[]
  clickables: ClickableElement[]
}
