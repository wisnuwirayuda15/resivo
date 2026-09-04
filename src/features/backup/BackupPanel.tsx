import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Code,
  FileButton,
  List,
  Loader,
  Text,
} from '@mantine/core'
import { useQueryClient } from '@tanstack/react-query'

import { Icon } from '@/features/icons/IconRenderer'
import { downloadBlob } from '@/lib/download'

import { createBackup, restoreBackup } from './backup'
import { parseBackup } from './format'

import type { RestoreReport } from './backup'

/**
 * Backup and restore.
 *
 * This is the only way data leaves the device, and the only way it comes back,
 * so both directions say plainly what they do. The restore in particular is
 * explicit that it *adds*: a user reaching for a backup usually has something
 * already broken, and the one outcome that must be impossible is a restore that
 * takes away what is still there.
 */

const summarise = (report: RestoreReport): Array<string> => {
  const lines: Array<string> = []

  if (report.resumesAdded > 0) {
    lines.push(
      `${report.resumesAdded} ${report.resumesAdded === 1 ? 'resume' : 'resumes'} restored` +
        (report.resumesRenumbered > 0
          ? ` (${report.resumesRenumbered} kept alongside an existing copy)`
          : ''),
    )
  }

  if (report.groupsAdded > 0) {
    lines.push(`${report.groupsAdded} groups restored`)
  }

  if (report.imagesAdded > 0) {
    lines.push(`${report.imagesAdded} images restored`)
  }

  if (report.imagesAlreadyPresent > 0) {
    lines.push(
      `${report.imagesAlreadyPresent} images were already stored, so they were not duplicated`,
    )
  }

  if (report.fontsAdded > 0) {
    lines.push(`${report.fontsAdded} fonts restored`)
  }

  if (report.fontsAlreadyPresent > 0) {
    lines.push(`${report.fontsAlreadyPresent} fonts were already stored`)
  }

  if (report.settingsAdded > 0) {
    lines.push(
      `${report.settingsAdded} ${report.settingsAdded === 1 ? 'setting' : 'settings'} restored, leaving the ones this device already had`,
    )
  }

  return lines.length === 0
    ? ['That backup was empty. Nothing changed.']
    : lines
}

export const BackupPanel: React.FC = () => {
  const client = useQueryClient()

  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<RestoreReport | null>(null)

  const download = async () => {
    setBusy('backup')
    setError(null)

    try {
      const now = Date.now()
      const backup = await createBackup(now)
      const stamp = new Date(now).toISOString().slice(0, 10)

      downloadBlob(
        // Indented, because a backup a user cannot read is a backup they cannot
        // check. The size cost is compression's problem, not theirs.
        new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
        `resivo-backup-${stamp}.json`,
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The backup could not be written.',
      )
    } finally {
      setBusy(null)
    }
  }

  const restore = async (file: File) => {
    setBusy('restore')
    setError(null)
    setReport(null)

    try {
      const parsed = parseBackup(await file.text())

      setReport(await restoreBackup(parsed, Date.now()))
      // Everything the library and the asset panels show has changed underneath
      // them.
      await client.invalidateQueries()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'That file could not be restored.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Box className="flex max-w-[62ch] flex-col gap-6">
      <Box>
        <Text className="text-body text-[14px] font-medium">Back up</Text>
        <Text className="text-muted mt-1 text-[13px]">
          Writes every resume, group, image and font on this device to one JSON
          file. Nothing is sent anywhere, the file is saved by your browser.
        </Text>

        <Button
          className="mt-3"
          leftSection={<Icon name="download-simple" size={14} />}
          loading={busy === 'backup'}
          onClick={() => void download()}
          size="xs"
          variant="default"
        >
          Download backup
        </Button>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">Restore</Text>
        <Text className="text-muted mt-1 text-[13px]">
          Adds the contents of a backup to this device. Nothing already here is
          replaced or deleted: a resume that collides with one you already have
          is restored beside it, marked{' '}
          <Code className="text-[12px]">(restored)</Code>, and an image whose
          bytes are already stored is not duplicated.
        </Text>

        <FileButton
          accept="application/json,.json"
          onChange={(file) => file && void restore(file)}
        >
          {(props) => (
            <Button
              {...props}
              className="mt-3"
              leftSection={<Icon name="upload-simple" size={14} />}
              loading={busy === 'restore'}
              size="xs"
              variant="default"
            >
              Choose a backup file
            </Button>
          )}
        </FileButton>
      </Box>

      {busy === 'restore' ? (
        <Box className="flex items-center gap-2">
          <Loader size={14} />
          <Text className="text-muted text-[12px]">Restoring…</Text>
        </Box>
      ) : null}

      {error === null ? null : (
        <Alert
          color="red"
          icon={<Icon name="warning" size={14} />}
          title="Nothing was restored"
          variant="light"
        >
          <Text className="text-[12px]">{error}</Text>
        </Alert>
      )}

      {report === null ? null : (
        <Alert
          color="teal"
          icon={<Icon name="check-circle" size={14} />}
          title="Restored"
          variant="light"
        >
          <List className="text-[12px]" size="xs" spacing={2}>
            {summarise(report).map((line) => (
              <List.Item key={line}>{line}</List.Item>
            ))}
          </List>
        </Alert>
      )}
    </Box>
  )
}
