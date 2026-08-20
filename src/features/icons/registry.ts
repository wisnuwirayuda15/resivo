import {
  Archive,
  ArrowCounterClockwise,
  ArrowSquareOut,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsHorizontal,
  Briefcase,
  CaretDown,
  CaretLeft,
  CaretRight,
  Certificate,
  Check,
  CheckCircle,
  ClipboardText,
  Clock,
  ClockClockwise,
  Columns,
  Copy,
  CursorText,
  DotsSix,
  DotsSixVertical,
  DotsThree,
  DotsThreeVertical,
  DownloadSimple,
  Envelope,
  EnvelopeSimple,
  Export,
  FileArrowDown,
  FileCss,
  FilePdf,
  FilePlus,
  FileText,
  FileZip,
  Folder,
  FolderOpen,
  Gear,
  GithubLogo,
  GlobeSimple,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Keyboard,
  LinkSimple,
  LinkedinLogo,
  ListChecks,
  ListDashes,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  MarkdownLogo,
  Minus,
  Moon,
  Phone,
  Plugs,
  Plus,
  Printer,
  SidebarSimple,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
  Star,
  Sun,
  TextAa,
  TextH,
  Trash,
  Translate,
  Trophy,
  UploadSimple,
  User,
  Warning,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

/**
 * Maps the design system's kebab-case Phosphor names onto React components.
 *
 * The design system references icons the way the Phosphor webfont does
 * (`file-text`), while this app uses the React package for two reasons the
 * webfont cannot serve: the icon picker needs to render thousands of glyphs under
 * virtualization, and HTML export has to inline real `<svg>` so the file stays
 * self-contained with no network or font dependency.
 *
 * This registry is the curated set the chrome and the templates use. Phase 9
 * adds the generated full-catalogue lookup behind the same interface, so the
 * document model keeps storing nothing but `{ name, weight }`.
 */
export const ICON_REGISTRY: Record<string, PhosphorIcon> = {
  // Documents and files
  'file-text': FileText,
  'file-plus': FilePlus,
  'file-pdf': FilePdf,
  'file-css': FileCss,
  'file-zip': FileZip,
  'file-arrow-down': FileArrowDown,
  'markdown-logo': MarkdownLogo,
  'clipboard-text': ClipboardText,

  // Organisation
  folder: Folder,
  'folder-open': FolderOpen,
  'squares-four': SquaresFour,
  'list-dashes': ListDashes,
  'list-checks': ListChecks,
  archive: Archive,
  star: Star,
  clock: Clock,
  'clock-clockwise': ClockClockwise,

  // Actions
  plus: Plus,
  minus: Minus,
  'arrows-horizontal': ArrowsHorizontal,
  x: X,
  check: Check,
  'check-circle': CheckCircle,
  trash: Trash,
  copy: Copy,
  export: Export,
  'download-simple': DownloadSimple,
  'upload-simple': UploadSimple,
  printer: Printer,
  'magnifying-glass': MagnifyingGlass,
  'arrow-counter-clockwise': ArrowCounterClockwise,
  'arrow-u-up-left': ArrowUUpLeft,
  'arrow-u-up-right': ArrowUUpRight,
  'arrow-square-out': ArrowSquareOut,

  // Chrome and controls
  gear: Gear,
  'sliders-horizontal': SlidersHorizontal,
  columns: Columns,
  'sidebar-simple': SidebarSimple,
  'dots-three': DotsThree,
  'dots-three-vertical': DotsThreeVertical,
  'dots-six': DotsSix,
  'dots-six-vertical': DotsSixVertical,
  'caret-left': CaretLeft,
  'caret-right': CaretRight,
  'caret-down': CaretDown,
  keyboard: Keyboard,
  'cursor-text': CursorText,
  plugs: Plugs,
  sparkle: Sparkle,
  sun: Sun,
  moon: Moon,

  // Status
  info: Info,
  warning: Warning,
  'warning-circle': WarningCircle,
  'lock-simple': LockSimple,

  // Typography and media
  'text-aa': TextAa,
  'text-h': TextH,
  image: ImageIcon,

  // Resume content — contact rows and section headings
  'envelope-simple': EnvelopeSimple,
  envelope: Envelope,
  phone: Phone,
  'map-pin': MapPin,
  'globe-simple': GlobeSimple,
  'link-simple': LinkSimple,
  'github-logo': GithubLogo,
  'linkedin-logo': LinkedinLogo,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  certificate: Certificate,
  trophy: Trophy,
  translate: Translate,
  user: User,
}

/** Undefined for an unknown name, so the renderer can degrade instead of
 * throwing on a document that names an icon this build does not carry. */
export const resolveIcon = (name: string): PhosphorIcon | undefined =>
  ICON_REGISTRY[name]

export const ICON_NAMES = Object.keys(ICON_REGISTRY)
