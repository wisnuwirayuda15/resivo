import {
  Box,
  Loader,
  Modal,
  SegmentedControl,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ICON_WEIGHTS } from '@/features/resume/model/document'

import { cn } from '@/lib/utils'

import { Icon } from './IconRenderer'
import {
  isIconWeight,
  loadGlyphs,
  loadIconCatalog,
  searchIcons,
} from './catalog'

import type { IconWeight } from '@/features/resume/model/document'
import type { IconCatalog, IconEntry } from './catalog'

/**
 * The icon picker: all 1512 Phosphor icons, in all six weights, searchable.
 *
 * Two things keep it fast. The glyphs are one lazy import per weight rather than
 * 1512 component modules (and the search index is a seventh file, so typing is
 * never waiting on markup), and the grid is row-virtualized, so at any moment
 * about sixty glyphs exist in the DOM, whatever the query matched. Mounting the
 * whole set would be thousands of SVG nodes, which is not a frame-rate problem
 * so much as a several-second-freeze problem.
 *
 * The columns are computed from the measured width rather than fixed, because
 * this opens in a 288px inspector today and could open in a dialog tomorrow; a
 * hard-coded column count would leave a ragged gap in one of them.
 */

/** Edge length of one cell, including its padding. */
const CELL = 40

/** Waiting this long before searching keeps the grid from re-flowing on every
 * keystroke while still feeling immediate. */
const SEARCH_DELAY_MS = 80

/** Single letters, because six full weight names do not fit a 480px dialog and
 * the glyphs in the grid are the real label, the control only has to say which
 * one is showing. */
const WEIGHT_LABELS: Record<IconWeight, string> = {
  thin: 'Thin',
  light: 'Light',
  regular: 'Regular',
  bold: 'Bold',
  fill: 'Fill',
  duotone: 'Duo',
}

interface IconPickerProps {
  opened: boolean
  /** The name currently chosen, if any. Shown selected and scrolled to. */
  value?: string
  /** The weight currently chosen. The grid opens showing it. */
  weight?: IconWeight
  onChange: (name: string, weight: IconWeight) => void
  onClear?: () => void
  onClose: () => void
}

const IconGrid: React.FC<{
  catalog: IconCatalog
  query: string
  value: string | undefined
  weight: IconWeight
  onChange: (name: string) => void
}> = ({ catalog, query, value, weight, onChange }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [columns, setColumns] = useState(6)

  const matches = useMemo(
    () => searchIcons(catalog.entries, query),
    [catalog.entries, query],
  )

  /** Index of the cell that owns the tab stop. The grid is one tab stop with
   * arrow-key movement inside it, not 1512 of them. */
  const [active, setActive] = useState(0)

  useEffect(() => {
    // A new query means the old position is meaningless.
    setActive(0)
  }, [query])

  useEffect(() => {
    const element = scrollRef.current

    if (element === null) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0

      setColumns(Math.max(1, Math.floor(width / CELL)))
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const rows = Math.ceil(matches.length / columns)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CELL,
    // A couple of rows either side, so a fast scroll does not show blank space.
    overscan: 3,
  })

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(matches.length - 1, active + delta))

    setActive(next)
    virtualizer.scrollToIndex(Math.floor(next / columns))
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
      PageDown: columns * 5,
      PageUp: -columns * 5,
    }

    const step = steps[event.key]

    if (step !== undefined) {
      event.preventDefault()
      move(step)
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : matches.length - 1)
      virtualizer.scrollToIndex(event.key === 'Home' ? 0 : rows - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const chosen = matches[active]

      if (chosen !== undefined) {
        event.preventDefault()
        onChange(chosen.name)
      }
    }
  }

  if (matches.length === 0) {
    return (
      <Box className="flex flex-1 items-center justify-center p-6">
        <Text className="text-muted text-center text-[12px]">
          No icon matches that. Try a word for what it depicts,
          &ldquo;mail&rdquo; finds the envelope.
        </Text>
      </Box>
    )
  }

  return (
    <>
      <Box
        className="min-h-0 flex-1 overflow-y-auto outline-none"
        // The grid itself is focusable; the cells are not, which is what makes
        // arrow-key movement possible without 1512 tab stops.
        onKeyDown={handleKeyDown}
        ref={scrollRef}
        role="listbox"
        aria-label="Icons"
        tabIndex={0}
      >
        <Box
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <Box
              className="absolute top-0 left-0 flex w-full"
              key={row.key}
              style={{
                height: row.size,
                transform: `translateY(${row.start}px)`,
              }}
            >
              {matches
                .slice(row.index * columns, row.index * columns + columns)
                .map((entry, column) => {
                  const index = row.index * columns + column

                  return (
                    <Cell
                      active={index === active}
                      entry={entry}
                      key={entry.name}
                      onSelect={() => {
                        setActive(index)
                        onChange(entry.name)
                      }}
                      selected={entry.name === value}
                      weight={weight}
                    />
                  )
                })}
            </Box>
          ))}
        </Box>
      </Box>

      <Box className="border-line-soft flex h-statusbar flex-none items-center justify-between border-t px-3">
        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {matches.length} of {catalog.entries.length}
        </Text>
        <Text className="text-subtle truncate pl-2 font-mono text-[11px]" span>
          {matches[active]?.name ?? ''}
        </Text>
      </Box>
    </>
  )
}

const Cell: React.FC<{
  entry: IconEntry
  selected: boolean
  active: boolean
  weight: IconWeight
  onSelect: () => void
}> = ({ entry, selected, active, weight, onSelect }) => (
  <UnstyledButton
    title={entry.name}
    aria-label={entry.name}
    aria-selected={selected}
    className={cn(
      'rounded-control flex items-center justify-center',
      'duration-fast ease-standard transition-colors',
      selected
        ? 'text-accent bg-selected'
        : active
          ? 'text-body bg-hover'
          : 'text-muted hover:bg-hover hover:text-body',
    )}
    onClick={onSelect}
    role="option"
    style={{ width: CELL, height: CELL }}
    // Never a tab stop: the grid owns the tab stop and moves this with the
    // arrow keys.
    tabIndex={-1}
  >
    <Icon name={entry.name} size={18} weight={weight} />
  </UnstyledButton>
)

export const IconPicker: React.FC<IconPickerProps> = ({
  opened,
  value,
  weight: chosenWeight,
  onChange,
  onClear,
  onClose,
}) => {
  const [catalog, setCatalog] = useState<IconCatalog | null>(null)
  const [typed, setTyped] = useState('')
  const [query, setQuery] = useState('')
  const [weight, setWeight] = useState<IconWeight>(chosenWeight ?? 'regular')
  /** The weight the loaded glyphs belong to. Until it matches the chosen one,
   * the grid would draw reserved boxes for everything not curated. */
  const [drawn, setDrawn] = useState<IconWeight | null>(null)

  useEffect(() => {
    if (!opened) {
      return
    }

    let cancelled = false

    /**
     * Both pieces, and the grid waits for both: the index alone would draw the
     * seventy-odd curated icons and reserve blank space for the rest, which
     * reads as a broken picker rather than as a loading one.
     */
    void Promise.all([loadIconCatalog(), loadGlyphs(weight)]).then(
      ([loaded]) => {
        if (!cancelled) {
          setCatalog(loaded)
          setDrawn(weight)
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [opened, weight])

  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed), SEARCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [typed])

  const handleChange = useCallback(
    (name: string) => {
      onChange(name, weight)
      onClose()
    },
    [onChange, onClose, weight],
  )

  return (
    <Modal onClose={onClose} opened={opened} size={480} title="Choose an icon">
      <Box className="flex h-[460px] flex-col">
        <TextInput
          aria-label="Search icons"
          data-autofocus
          onChange={(event) => setTyped(event.currentTarget.value)}
          placeholder="Search 1512 icons: try mail, phone, github"
          size="xs"
          value={typed}
        />

        {/* Above the grid rather than beside it: switching weight redraws every
            cell, and a control that sits over what it changes makes that
            obvious. */}
        <SegmentedControl
          aria-label="Icon weight"
          className="mt-2 flex-none"
          data={ICON_WEIGHTS.map((option) => ({
            value: option,
            label: WEIGHT_LABELS[option],
          }))}
          fullWidth
          onChange={(next) => {
            if (isIconWeight(next)) {
              setWeight(next)
            }
          }}
          size="xs"
          value={weight}
        />

        <Box className="mt-2 flex min-h-0 flex-1 flex-col">
          {catalog === null || drawn !== weight ? (
            <Box className="flex flex-1 items-center justify-center">
              <Loader size="sm" />
            </Box>
          ) : (
            <IconGrid
              catalog={catalog}
              onChange={handleChange}
              query={query}
              value={value}
              weight={weight}
            />
          )}
        </Box>

        {onClear === undefined ? null : (
          <Box className="flex flex-none justify-end pt-2">
            <UnstyledButton
              className="text-muted hover:text-body hover:bg-hover rounded-control px-2 py-1 text-[12px]"
              onClick={() => {
                onClear()
                onClose()
              }}
            >
              Remove icon
            </UnstyledButton>
          </Box>
        )}
      </Box>
    </Modal>
  )
}
