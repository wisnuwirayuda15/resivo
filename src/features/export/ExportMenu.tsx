import { useState } from 'react'
import { Box, Button, Menu, Text } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'
import { downloadBlob, safeFilename } from '@/lib/download'

import { exportAdapters } from './adapters'

import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The export menu.
 *
 * PDF sits above the file formats and is not one of them: it is the browser
 * printing the preview iframe, which is what makes the PDF *be* the preview
 * rather than resemble it. A second renderer producing a PDF would be a second
 * truth to keep in step, and the one thing this app promises about output is
 * that there is only one.
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
  /** `null` while the preview iframe is not loaded. */
  onPrint: (() => void) | null
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  document: resume,
  title,
  pages,
  onPrint,
}) => {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (format: string) => {
    const adapter = exportAdapters.find(
      (candidate) => candidate.format === format,
    )

    if (adapter === undefined) {
      return
    }

    setBusy(format)
    setError(null)

    try {
      const blob = await adapter.run({ document: resume, title, pages })

      downloadBlob(blob, safeFilename(title, adapter.extension))
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
            disabled={onPrint === null}
            leftSection={<Icon name="file-pdf" size={14} />}
            onClick={() => onPrint?.()}
          >
            <Text className="text-[13px]">PDF</Text>
            <Text className="text-subtle text-[11px]">
              Opens the print dialog. Choose &ldquo;Save as PDF&rdquo;.
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
