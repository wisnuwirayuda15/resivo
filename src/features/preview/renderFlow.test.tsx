import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'

import { createEmptyDocument } from '@/features/resume/model/index'
import { resolveTemplate } from '@/features/templates/registry'

import { documentFlow } from './flow'
import { renderFlow } from './renderFlow'

import type { RenderContext } from '@/features/templates/renderer/types'
import type { FlowItem } from './flow'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * These assertions inspect elements rather than rendering them: `renderFlow`'s
 * job is the mapping, and the mapping is checkable without a DOM. What each
 * component paints is the template's business and is verified in the browser.
 */

const sample = (): ResumeDocument => {
  const document = createEmptyDocument('classic')

  document.content.header.name = [{ type: 'text', text: 'Ada Lovelace' }]
  document.content.sections[0]?.blocks.push({
    id: 'block-1',
    kind: 'paragraph',
    text: [{ type: 'text', text: 'A summary.' }],
  })

  return document
}

const contextFor = (document: ResumeDocument): RenderContext => ({
  locale: document.meta.locale,
  design: document.design,
})

describe('renderFlow', () => {
  it('returns one entry per flow item, in order', () => {
    const document = sample()
    const items = documentFlow(document)
    const rendered = renderFlow(
      document,
      resolveTemplate(document.templateId),
      contextFor(document),
      items,
    )

    expect(rendered.map(({ item }) => item.id)).toEqual(
      items.map((item) => item.id),
    )
  })

  it('renders the header, headings and blocks with the template components', () => {
    const document = sample()
    const template = resolveTemplate(document.templateId)
    const items = documentFlow(document)
    const rendered = renderFlow(document, template, contextFor(document), items)

    const typeOf = (id: string) => {
      const node = rendered.find((entry) => entry.item.id === id)?.node

      return isValidElement(node) ? node.type : undefined
    }

    expect(typeOf('header')).toBe(template.components.Header)
    expect(typeOf(`section:${document.content.sections[0]?.id}`)).toBe(
      template.components.SectionHeading,
    )
    expect(typeOf('block:block-1')).toBe(template.components.Block)
  })

  /**
   * The preview joins measured heights to items by index, so an item that
   * silently disappeared here would shift every measurement after it onto the
   * wrong element — the page breaks would be computed from another block's
   * height.
   */
  it('keeps a placeholder entry for an item whose target is gone', () => {
    const document = sample()
    const items: Array<FlowItem> = [
      { id: 'section:missing', type: 'sectionHeading', sectionId: 'missing' },
      { id: 'block:missing', type: 'block', blockId: 'missing' },
    ]

    const rendered = renderFlow(
      document,
      resolveTemplate(document.templateId),
      contextFor(document),
      items,
    )

    expect(rendered).toHaveLength(2)
    expect(rendered.every(({ node }) => node === null)).toBe(true)
  })

  it('uses the template the document names', () => {
    const document = sample()
    document.templateId = 'editorial'

    const template = resolveTemplate('editorial')
    const rendered = renderFlow(
      document,
      template,
      contextFor(document),
      documentFlow(document),
    )
    const header = rendered[0]?.node

    expect(isValidElement(header) ? header.type : undefined).toBe(
      template.components.Header,
    )
  })
})
