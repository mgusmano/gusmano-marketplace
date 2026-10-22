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
  list = list.map(s => ({ ...s, expanded: true }))
  $.ui.invalidate('ui.render')
}

export function collapseAll($: any) {
  list = list.map(s => ({ ...s, expanded: false }))
  $.ui.invalidate('ui.render')
}

export async function addSection($: any, title?: string, message?: string, step?: Pick<ExpanderSection, 'status' | 'subject'>) {
  if (message === undefined) { message = '' }
  const n = list.length + 1
  const previous = list.length - 1
  const id = `section-${n}`
  const section: ExpanderSection = { id, title: title ?? `section ${n}`, message, items: [], expanded: true }
  if (step?.status !== undefined) section.status = step.status
  if (step?.subject !== undefined) section.subject = step.subject
  list = [
    ...list.map((s, i) => (i === previous ? { ...s, expanded: false } : s)),
    section,
  ]
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

  return id
}

export function setSectionStatus($: any, id: string, status: ExpanderSection['status']) {
  //$.ui.log(`setSectionStatus: ${id} ${status}`)
  list = list.map(s => (s.id === id ? { ...s, status } : s))
  $.ui.invalidate('ui.render')
}

export function toggleSection(id: string, open: boolean) {
  list = list.map(s => (s.id === id ? { ...s, expanded: open } : s))
}

export async function addItem($: any, id: string, title?: string) {
  list = list.map(s => {
    if (s.id !== id) return s
    const n = (s.items?.length ?? 0) + 1
    return { ...s, items: [...(s.items ?? []), title ?? `item ${n}`] }
  })
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')
}

export async function addItemToLatestSection($: any, title?: string) {
  //$.ui.log(`addItemToLatestSection: title-"${title}"`)
  const latest = list[list.length - 1]
  if (latest) await addItem($, latest.id, title)
}

export function resetSections($: any) {
  list = []
  $.ui.invalidate('ui.render')
}

export async function runTests($: any) {
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
