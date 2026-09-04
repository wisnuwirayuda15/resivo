import { useState } from 'react'
import { Box, Button, Menu, Text } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'
import { downloadBlob, safeFilename } from '@/lib/download'

import { buildExportHtml, exportAdapters } from './adapters'
import { printExportHtml } from './print'

import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The export menu.
 *
 * PDF sits above the file formats and is not one of them: it produces no file,
 * it hands a document to the browser to print. That document is the HTML export
 * (the same bytes, with the typefaces and images inlined and the measured page
 * breaks already in page boxes), so the PDF and the HTML file are one artefact
 * with two destinations, and neither can drift from the preview.
 *
 * It is disabled until the first pagination lands, because the page breaks are
 * a measurement. Printing before one would silently fall back to a single
 * continuous page.
 */

const ICONS: Record<string, string> = {
  html: 'file-text',
  markdown: 'markdown-logo',
}

interface ExportMenuProps {
  document: ResumeDocument
  title: string
  /** The page breaks the preview measured, so a file export matches what is on
   * screen. Absent until the first measurement lands. */
  pages?: ReadonlyArray<ReadonlyArray<string>>
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  document: resume,
  title,
  pages,
}) => {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * One path for every entry in the menu, including PDF.
   *
   * PDF is not an adapter because it produces no file, but it is the same
   * build, the same failures and the same busy state, so it goes through the
   * same function rather than a second one beside it.
   */
  const run = async (format: string) => {
    const context = { document: resume, title, pages }

    setBusy(format)
    setError(null)

    try {
      if (format === 'pdf') {
        await printExportHtml(await buildExportHtml(context))
      } else {
        const adapter = exportAdapters.find(
          (candidate) => candidate.format === format,
        )

        if (adapter === undefined) {
          return
        }

        downloadBlob(
          await adapter.run(context),
          safeFilename(title, adapter.extension),
        )
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The export could not be written.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Box className="flex items-center gap-2">
      {error === null ? null : (
        <Text className="text-danger max-w-[24ch] truncate text-[11px]" span>
          {error}
        </Text>
      )}

      <Menu position="bottom-end" shadow="md" width={260}>
        <Menu.Target>
          <Button
            leftSection={<Icon name="export" size={13} />}
            loading={busy !== null}
            size="xs"
            variant="default"
          >
            Export
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Print</Menu.Label>
          <Menu.Item
            disabled={pages === undefined}
            leftSection={<Icon name="file-pdf" size={14} />}
            onClick={() => void run('pdf')}
          >
            <Text className="text-[13px]">PDF</Text>
            <Text className="text-subtle text-[11px]">
              Prints the exported document. Choose &ldquo;Save as PDF&rdquo;,
              and leave the scale and margins as they are.
            </Text>
          </Menu.Item>

          <Menu.Divider />
          <Menu.Label>File</Menu.Label>

          {exportAdapters.map((adapter) => (
            <Menu.Item
              key={adapter.format}
              leftSection={
                <Icon name={ICONS[adapter.format] ?? 'file-text'} size={14} />
              }
              onClick={() => void run(adapter.format)}
            >
              <Text className="text-[13px]">{adapter.label}</Text>
              <Text className="text-subtle text-[11px]">{adapter.hint}</Text>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Box>
  )
}
