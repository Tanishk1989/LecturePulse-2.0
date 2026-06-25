import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { useI18n } from '@/context/I18nContext'
import { mergeTimetableEntries, parseIcsToTimetable } from '@/lib/icsImport'
import type { TimetableEntry } from '@/lib/timetable'
import { cn } from '@/lib/utils'

interface IcsImportButtonProps {
  existing: TimetableEntry[]
  onImport: (entries: TimetableEntry[]) => void
}

export function IcsImportButton({ existing, onImport }: IcsImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { translate } = useI18n()
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      const text = await file.text()
      const parsed = parseIcsToTimetable(text)
      if (parsed.length === 0) {
        toast.error('No recurring classes found in this calendar file.')
        return
      }
      const merged = mergeTimetableEntries(existing, parsed)
      onImport(merged)
      toast.success(`Imported ${parsed.length} class${parsed.length === 1 ? '' : 'es'} from calendar.`)
    } catch {
      toast.error('Could not read calendar file. Try exporting .ics from Google Calendar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2.5',
          'text-sm font-medium text-foreground bg-white/[0.03] cursor-pointer',
          'hover:border-accent/25 hover:bg-accent/[0.06] disabled:opacity-50',
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        {translate('timetable.importIcs')}
      </button>
    </>
  )
}
