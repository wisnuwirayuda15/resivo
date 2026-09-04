/**
 * Handing a file to the user.
 *
 * A blob and an anchor, not a data URL: a data URL puts the whole file in the
 * `href`, which browsers cap and which shows the entire document in the download
 * bar. The URL is revoked on the next turn of the event loop, after the click
 * has been dispatched, and before it can outlive the file it points at.
 */

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * A file name safe on every platform, derived from the resume's title.
 *
 * Windows refuses more characters than POSIX does, and a name that only fails on
 * one platform is worse than a conservative name everywhere: the download simply
 * does not appear, with no error the user can act on.
 */
export const safeFilename = (title: string, extension: string): string => {
  const base = title
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return `${base === '' ? 'resume' : base}.${extension}`
}
