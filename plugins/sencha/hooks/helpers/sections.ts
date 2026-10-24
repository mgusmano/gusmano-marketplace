import type { ExpanderProps, ExpanderSection } from '../components/expander'

let list: ExpanderSection[] = []

// latest set of sections, for the UI and anything else that reads section data
export function sections(): ExpanderSection[] {
  return list
}

const cleanData = (value: any, path: string, dropped: string[]): any => {
  if (Array.isArray(value)) return value.map((v, i) => cleanData(v, `${path}[${i}]`, dropped))
  if (value !== null && typeof value === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) { dropped.push(`${path}.${k}`); continue }
      out[k] = cleanData(v, `${path}.${k}`, dropped)
    }
    return out
  }
  return value
}

export function expanderProps(dropped: string[] = []): ExpanderProps {
  return {
    sections: cleanData(list, 'sections', dropped),
    titleColor: 'cyan',
    itemColor: 'yellow',
    hoverBg: '#14532d',
    unicode: true,
  }
}

export function expandAll($: any) {
  try {
    list = list.map(s => ({ ...s, expanded: true }))
    $.ui.invalidate('ui.render')
  }
  catch (error) {
    $.ui.log(`error here...`)
  }
}

export function collapseAll($: any) {
  list = list.map(s => ({ ...s, expanded: false }))
  $.ui.invalidate('ui.render')
}

// title: the first column. name: the white column after it. value: the italic purple column after that.
export async function addSection($: any, title?: string, name?: string, value?: string, step?: Pick<ExpanderSection, 'status' | 'subject'>) {
  if (name === undefined) { name = '' }
  const n = list.length + 1
  const id = `section-${n}`
  const section: ExpanderSection = { id, title: title ?? `section ${n}`, message: name, items: [], expanded: true }
  if (value !== undefined) section.detail = value
  if (step?.status !== undefined) section.status = step.status
  if (step?.subject !== undefined) section.subject = step.subject
  $.ui.log(`addSection ${title} ${name} ${value ?? ''} ${JSON.stringify(step)}`)
  list = [
    ...list.map(s => ({ ...s, expanded: false })),
    section,
  ]
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

  return id
}

export function setSectionStatus($: any, id: string, status: ExpanderSection['status']) {
  list = list.map(s => (s.id === id ? { ...s, status } : s))
  $.ui.invalidate('ui.render')
}

export function toggleSection(id: string, open: boolean) {
  // Accordion: opening a section collapses whichever section was open before,
  // so at most one section is expanded at a time. Collapsing only affects the
  // target. Collapsing every other expanded section is equivalent to tracking
  // the previous id, and cannot drift out of sync with list/addSection/etc.
  list = list.map(s => {
    if (s.id === id) return { ...s, expanded: open }
    if (open && s.expanded) return { ...s, expanded: false }
    return s
  })
}

export async function addItem($: any, id: string, title?: string, color?: string, italic?: boolean) {
  list = list.map(s => {
    if (s.id !== id) return s
    const n = (s.items?.length ?? 0) + 1
    const text = title ?? `item ${n}`
    // only the style fields that are set, so the props stay free of undefined values
    const item = color || italic ? { text, ...(color ? { color } : {}), ...(italic ? { italic } : {}) } : text
    return { ...s, items: [...(s.items ?? []), item] }
  })
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')
}

export async function addItemToLatestSection($: any, title?: string, color?: string, italic?: boolean) {
  const latest = list[list.length - 1]
  if (latest) await addItem($, latest.id, title, color, italic)
}

export function resetSections($: any) {
  list = []
  $.ui.invalidate('ui.render')
}

export async function runTests($: any) {
  const wait = 0;
  for (let i = 0; i < 10; i++) {
    await addSection($, `new section ${i}`)
    await $.clock.sleep(wait)
    const count = 5 + Math.floor(Math.random() * 6)
    for (let j = 0; j < count; j++) {
      await addItemToLatestSection($, `new item ${j}`)
      await $.clock.sleep(wait)
    }
  }
}



export async function runTests2($: any) {
  const wait = 50;
  for (let i = 0; i < 10; i++) {
    await addSection($, `new section ${i}`)
    await $.clock.sleep(wait)
    const count = 5 + Math.floor(Math.random() * 6)
    for (let j = 0; j < count; j++) {
      await addItemToLatestSection($, `new item ${j}`)
      await $.clock.sleep(wait)
    }
  }
}
