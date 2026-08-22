/**
 * Which stored assets a single document refers to.
 *
 * The repositories answer this across *every* resume, for the gallery's "unused"
 * view. This answers it for one, which is what the preview needs: it decides
 * which blobs to read and hold while a document is open, and nothing else.
 */

import type { ResumeDocument } from '@/features/resume/model/document'

export const documentImageIds = (document: ResumeDocument): Array<string> => {
  const ids = new Set<string>()
  const { header, sections } = document.content

  if (header.avatarImageId !== undefined) {
    ids.add(header.avatarImageId)
  }

  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.kind === 'image') {
        ids.add(block.imageId)
      }
    }
  }

  return [...ids]
}

export const documentFontIds = (document: ResumeDocument): Array<string> => {
  const ids = new Set<string>()
  const { bodyFont, headingFont } = document.design.typography

  for (const font of [bodyFont, headingFont]) {
    if (font?.source === 'custom' && font.fontId !== undefined) {
      ids.add(font.fontId)
    }
  }

  return [...ids]
}
