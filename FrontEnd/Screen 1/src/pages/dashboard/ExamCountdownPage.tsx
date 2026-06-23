import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Timer, 
  Flame, 
  Award, 
  Sparkles, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  AlertTriangle,
  X,
  Plus
} from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { 
  getExamCountdownData, 
  setExamCountdown, 
  deleteExamCountdown, 
  type Exam, 
  type ExamCountdownData 
} from '@/services/examCountdownService'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'

export function ExamCountdownPage() {
  const [data, setData] = useState<ExamCountdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examDateStr, setExamDateStr] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [activeMonth, setActiveMonth] = useState(new Date())
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const res = await getExamCountdownData()
      setData(res)
      if (res.exam) {
        setExamTitle(res.exam.title)
        setExamDateStr(res.exam.date.split('T')[0])
      }
    } catch (err) {
      console.error('Failed to load exam countdown data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!data?.exam) return null
    const examDate = new Date(data.exam.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    examDate.setHours(0, 0, 0, 0)
    const diffTime = examDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [data])

  // Determine Danger Zone / Urgency mode
  const urgencyMode = useMemo(() => {
    if (daysRemaining === null) return 'none'
    if (daysRemaining > 30) return 'green'
    if (daysRemaining >= 15 && daysRemaining <= 30) return 'gradient-amber'
    if (daysRemaining >= 4 && daysRemaining <= 14) return 'orange'
    return 'red' // <= 3 days
  }, [daysRemaining])

  // Get color and styles depending on urgency level
  const urgencyStyles = useMemo(() => {
    switch (urgencyMode) {
      case 'green':
        return {
          textClass: 'text-emerald-500 dark:text-emerald-400',
          bgGlow: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/25',
          bannerText: 'Soft green — calm, steady preparation.',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }
      case 'gradient-amber':
        return {
          textClass: 'text-amber-500 dark:text-amber-400',
          bgGlow: 'bg-amber-500/10',
          borderColor: 'border-amber-500/25',
          bannerText: 'Warm amber — focus is intensifying.',
          badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }
      case 'orange':
        return {
          textClass: 'text-orange-500 dark:text-orange-400',
          bgGlow: 'bg-orange-500/12',
          borderColor: 'border-orange-500/30 danger-pulse-bg',
          bannerText: '🚨 Warning: Exam is near. Increase focus!',
          badgeColor: 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
        }
      case 'red':
        return {
          textClass: 'text-red-500 dark:text-red-400',
          bgGlow: 'bg-red-500/15',
          borderColor: 'border-red-500/40 danger-pulse-bg',
          bannerText: '🔥 FINAL SPRINT — Give it everything!',
          badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/20'
        }
      default:
        return {
          textClass: 'text-accent dark:text-accent-soft',
          bgGlow: 'bg-accent/5',
          borderColor: 'border-white/[0.08]',
          bannerText: 'Set a target exam to start your countdown.',
          badgeColor: 'bg-accent/10 text-accent border border-accent/20'
        }
    }
  }, [urgencyMode])

  // Generate calendar days for the activeMonth
  const calendarDays = useMemo(() => {
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    // 0 = Mon, 6 = Sun
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const totalDays = new Date(year, month + 1, 0).getDate()

    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const examDate = data?.exam ? new Date(data.exam.date) : null
    if (examDate) examDate.setHours(0, 0, 0, 0)

    // Pre-populate with previous month's cells for perfect spacing
    for (let i = 0; i < startOffset; i++) {
      days.push({ isSpacer: true, date: null })
    }

    // Populate actual days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d)
      const dateStr = date.toISOString().split('T')[0]
      const isToday = date.toDateString() === today.toDateString()
      const isExamDay = examDate ? date.toDateString() === examDate.toDateString() : false
      const isFuture = date.getTime() > today.getTime()

      // Fetch study time and subjects
      const dayData = data?.durations[dateStr] || { duration: 0, subjects: [] }
      const durationHours = dayData.duration / 3600

      // Compute cell status/color:
      // 🟩 = 3+ hrs
      // 🟨 = 1-3 hrs
      // 🟧 = < 1 hr (but > 0)
      // 🟥 = Missed important day (0 hrs, is weekday Mon-Fri, is in past)
      // ⬜ = Rest day (0 hrs, is weekend, today, or future)
      let colorType: 'green' | 'yellow' | 'orange' | 'red' | 'rest' = 'rest'
      
      if (durationHours >= 3) {
        colorType = 'green'
      } else if (durationHours >= 1) {
        colorType = 'yellow'
      } else if (durationHours > 0) {
        colorType = 'orange'
      } else if (!isFuture && !isToday) {
        const dayOfWeek = date.getDay() // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        if (!isWeekend) {
          colorType = 'red' // Missed weekday study
        }
      }

      days.push({
        isSpacer: false,
        date,
        dateStr,
        isToday,
        isExamDay,
        isFuture,
        durationHours,
        subjects: dayData.subjects,
        colorType
      })
    }

    return days
  }, [activeMonth, data])

  // Find the best study day (historically max duration)
  const bestStudyDay = useMemo(() => {
    if (!data || Object.keys(data.durations).length === 0) return null
    let maxDuration = 0
    let bestDateStr = ''
    let bestSubjects: string[] = []

    Object.entries(data.durations).forEach(([dateStr, dayData]) => {
      if (dayData.duration > maxDuration) {
        maxDuration = dayData.duration
        bestDateStr = dateStr
        bestSubjects = dayData.subjects
      }
    })

    if (maxDuration === 0) return null

    const formattedDate = new Date(`${bestDateStr}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })

    return {
      date: formattedDate,
      hours: (maxDuration / 3600).toFixed(1),
      subjects: bestSubjects.length > 0 ? bestSubjects : ['General Studies']
    }
  }, [data])

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examTitle.trim() || !examDateStr) {
      toast.error('Please fill in all fields.')
      return
    }

    setActionLoading(true)
    try {
      const newExam = await setExamCountdown(examTitle, examDateStr)
      toast.success('🎯 Exam countdown set successfully!')
      setShowConfig(false)
      loadData()
    } catch (err) {
      toast.error('Failed to set exam countdown.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!window.confirm('Are you sure you want to remove the exam countdown?')) return
    setActionLoading(true)
    try {
      await deleteExamCountdown()
      toast.success('Exam countdown removed.')
      setExamTitle('')
      setExamDateStr('')
      loadData()
    } catch (err) {
      toast.error('Failed to delete exam.')
    } finally {
      setActionLoading(false)
    }
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    const nextMonth = new Date(activeMonth)
    if (direction === 'prev') {
      nextMonth.setMonth(nextMonth.getMonth() - 1)
    } else {
      nextMonth.setMonth(nextMonth.getMonth() + 1)
    }
    setActiveMonth(nextMonth)
  }

  const getCellColorClass = (colorType: string, isExamDay: boolean) => {
    if (isExamDay) return 'border-2 border-yellow-500 scale-105 shadow-[0_0_12px_rgba(234,179,8,0.5)]'
    switch (colorType) {
      case 'green':
        return 'bg-[#A3FF12] dark:bg-[#A3FF12] border border-white/[0.05]'
      case 'yellow':
        return 'bg-amber-400 dark:bg-amber-400/80 border border-white/[0.05]'
      case 'orange':
        return 'bg-orange-500/80 dark:bg-orange-500 border border-white/[0.05]'
      case 'red':
        return 'bg-red-500 dark:bg-red-500 border border-white/[0.05]'
      default:
        return 'bg-white/[0.04] dark:bg-white/[0.03] border border-white/[0.02]'
    }
  }

  const getUrgencyModeQuote = () => {
    if (daysRemaining === null) return 'Set your target exam to begin tracking.'
    if (daysRemaining <= 3) return 'This is the final stretch. Clear away distractions and finish strong.'
    if (daysRemaining <= 14) return 'Every minute counts now. Keep polishing your weak concepts!'
    if (daysRemaining <= 30) return 'Consistency is key. Keep showing up. Small efforts compound.'
    return 'Great foundations are built slowly. Stay steady, study smart.'
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          title="Exam Countdown"
          description="Prepare with visual consistency and emotional motivation."
        />
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-2 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <div className="max-w-4xl mx-auto space-y-8 relative">
        {/* Ambient background glow adapting to urgency level */}
        <div className={cn(
          "absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 opacity-20",
          data?.exam ? urgencyStyles.bgGlow : 'bg-accent/5'
        )} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FadeUp>
            <DashboardPageHeader
              title="Exam Countdown"
              description="Track consistency, visualize countdowns, and power through the study sprints."
            />
          </FadeUp>
          
          <FadeUp delay={0.02}>
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-foreground transition-all cursor-pointer shadow-sm"
            >
              <Settings size={14} />
              <span>Configure Countdown</span>
            </button>
          </FadeUp>
        </div>

        {/* Urgency warning banner for intense countdown */}
        {data?.exam && (urgencyMode === 'orange' || urgencyMode === 'red') && (
          <FadeUp delay={0.03}>
            <div className={cn(
              "flex items-center gap-3 px-5 py-3.5 rounded-2xl border bg-black/40 backdrop-blur-md text-sm font-medium",
              urgencyStyles.borderColor
            )}>
              <AlertTriangle className={cn("h-5 w-5 shrink-0", urgencyMode === 'red' ? 'text-red-500 animate-pulse' : 'text-orange-500')} />
              <span className="text-foreground">{urgencyStyles.bannerText}</span>
            </div>
          </FadeUp>
        )}

        {/* Hero Countdown Section */}
        <FadeUp delay={0.05}>
          <div className={cn(
            "relative overflow-hidden rounded-3xl border p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 bg-card/40 backdrop-blur-xl",
            data?.exam ? urgencyStyles.borderColor : 'border-white/[0.08]'
          )}>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/[0.01]" />
            <div className="relative z-10 flex flex-col items-center text-center">
              {data?.exam ? (
                <>
                  <span className={cn(
                    "text-xs font-extrabold uppercase tracking-[0.25em] px-3.5 py-1 rounded-full",
                    urgencyStyles.badgeColor
                  )}>
                    📉 {data.exam.title}
                  </span>
                  
                  <h2 className="mt-6 font-heading text-6xl md:text-7xl font-black tracking-tight text-foreground">
                    {daysRemaining !== null && daysRemaining >= 0 ? (
                      <>
                        <span className={cn("transition-colors duration-700", urgencyStyles.textClass)}>
                          {daysRemaining}
                        </span>
                        <span className="text-2xl md:text-3xl font-bold ml-2 text-muted">DAYS LEFT</span>
                      </>
                    ) : (
                      <span className="text-2xl md:text-3xl text-muted font-bold">EXAM PASSED</span>
                    )}
                  </h2>

                  <p className="mt-6 max-w-lg text-base md:text-lg italic text-foreground/90 font-medium">
                    "{getUrgencyModeQuote()}"
                  </p>

                  <div className="mt-4 text-xs text-muted font-semibold uppercase tracking-wider">
                    Exam Date: {new Date(data.exam.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </>
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-muted mb-4">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No target exam configured</h3>
                  <p className="text-xs text-muted max-w-sm mt-1">
                    Set your target study goal (like JEE MAIN, NEET, or college exams) to enable heatmaps, study streaks, and countdown sprint dynamics.
                  </p>
                  <button
                    onClick={() => setShowConfig(true)}
                    className="mt-5 rounded-full bg-accent px-5 py-2 text-xs font-bold text-[#09090b] hover:opacity-90 transition-all cursor-pointer shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.3)]"
                  >
                    Set Target Exam
                  </button>
                </div>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Study Heatmap Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <FadeUp delay={0.08} className="md:col-span-2">
            <div className="rounded-3xl border border-white/[0.08] bg-card/25 backdrop-blur-md p-6 shadow-xl flex flex-col h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    Study Heatmap
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Visualize your monthly learning consistency.</p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-full px-3 py-1 self-start sm:self-auto">
                  <button
                    onClick={() => changeMonth('prev')}
                    className="p-1 rounded-full hover:bg-white/[0.06] text-muted hover:text-foreground cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider min-w-[100px] text-center select-none">
                    {activeMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => changeMonth('next')}
                    className="p-1 rounded-full hover:bg-white/[0.06] text-muted hover:text-foreground cursor-pointer transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted mb-5 pb-3 border-b border-white/[0.04]">
                <span>Legend:</span>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="h-2.5 w-2.5 rounded bg-[#A3FF12]" />
                  <span>3+ hrs</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="h-2.5 w-2.5 rounded bg-amber-400" />
                  <span>1–3 hrs</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="h-2.5 w-2.5 rounded bg-orange-500" />
                  <span>&lt; 1 hr</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="h-2.5 w-2.5 rounded bg-red-500" />
                  <span>Missed study day</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="h-2.5 w-2.5 rounded bg-white/[0.04]" />
                  <span>Rest / rest day</span>
                </div>
              </div>

              {/* Monthly Grid */}
              <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold tracking-wider text-muted-secondary mb-2 select-none uppercase">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>

                {/* Staggered Row Animation on page load */}
                <motion.div 
                  className="grid grid-cols-7 gap-2.5"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.015 }
                    }
                  }}
                >
                  {calendarDays.map((day, idx) => {
                    if (day.isSpacer) {
                      return <div key={`spacer-${idx}`} className="aspect-square bg-transparent" />
                    }

                    // Non-spacer cells always have these fields; defaults satisfy TS on the mixed array type
                    const durationHours = day.durationHours ?? 0
                    const colorType = day.colorType ?? 'rest'

                    // Format hover tooltip info
                    const formattedCellDate = day.date ? day.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    }) : ''

                    const hours = Math.floor(durationHours)
                    const minutes = Math.round((durationHours - hours) * 60)
                    const timeLabel = durationHours > 0 
                      ? `${hours}h ${minutes}m` 
                      : 'No study recorded'

                    const isPast = !day.isFuture && !day.isToday

                    return (
                      <motion.div
                        key={`day-${day.dateStr}`}
                        variants={{
                          hidden: { opacity: 0, scale: 0.8 },
                          show: { opacity: 1, scale: 1 }
                        }}
                        whileHover={!day.isFuture ? { 
                          scale: 1.15, 
                          boxShadow: '0 0 16px rgba(var(--color-accent-rgb), 0.25)', 
                          zIndex: 20 
                        } : {}}
                        className={cn(
                          "aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 relative group select-none",
                          getCellColorClass(colorType, day.isExamDay ?? false),
                          day.isToday && "today-cell-pulse",
                          day.isFuture && "pointer-events-none opacity-40"
                        )}
                      >
                        {/* Day number inside cell */}
                        <span className={cn(
                          "text-[10px] font-bold select-none",
                          colorType === 'green' || colorType === 'yellow' || colorType === 'orange' || colorType === 'red'
                            ? 'text-black' 
                            : 'text-muted-secondary group-hover:text-foreground'
                        )}>
                          {day.date?.getDate()}
                        </span>

                        {/* Exam Day 🎯 Icon overlay */}
                        {day.isExamDay && (
                          <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 rounded-full p-0.5 shadow-md">
                            <span className="text-[8px]">🎯</span>
                          </div>
                        )}

                        {/* Hover Tooltip (Glassmorphism design) */}
                        {!day.isFuture && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-0 group-hover:scale-100 transition-all duration-200 origin-bottom z-50 pointer-events-none">
                            <div className="bg-black/80 backdrop-blur-lg border border-white/[0.08] rounded-xl p-3 shadow-2xl text-left text-xs text-foreground space-y-1.5">
                              {day.isExamDay ? (
                                <>
                                  <div className="font-bold text-yellow-400">{data?.exam?.title}</div>
                                  <div className="text-[10px] text-muted">{formattedCellDate}</div>
                                  <div className="text-[10px] text-yellow-300 font-semibold">{daysRemaining !== null && daysRemaining >= 0 ? `${daysRemaining} Days Remaining` : 'Exam Passed'}</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-bold text-foreground border-b border-white/[0.04] pb-1 flex justify-between items-center">
                                    <span>{formattedCellDate}</span>
                                    {day.isToday && <span className="text-[8px] bg-accent/10 border border-accent/20 px-1 py-0.2 rounded text-accent">Today</span>}
                                  </div>
                                  
                                  <div>
                                    <span className="text-muted text-[10px]">Study Time:</span>
                                    <div className="font-semibold text-accent">{timeLabel}</div>
                                  </div>

                                  {day.subjects && day.subjects.length > 0 && (
                                    <div>
                                      <span className="text-muted text-[10px]">Subjects:</span>
                                      <div className="space-y-0.5 mt-0.5">
                                        {day.subjects.map((sub, i) => (
                                          <div key={i} className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                            <span>✓</span>
                                            <span className="truncate">{sub}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {durationHours > 0 && (
                                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/[0.04]">
                                      <span className="text-muted">Focus Score:</span>
                                      <span className="font-bold text-[#A3FF12]">
                                        {Math.floor(82 + (durationHours * 3) > 98 ? 98 : 82 + (durationHours * 3))}%
                                      </span>
                                    </div>
                                  )}

                                  {colorType === 'red' && (
                                    <div className="text-[9px] font-semibold text-red-400 flex items-center gap-1">
                                      <span>⚠️</span>
                                      <span>Missed study goal</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            {/* Tooltip arrow */}
                            <div className="h-2 w-2 bg-black/80 border-r border-b border-white/[0.08] rotate-45 mx-auto -mt-1" />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            </div>
          </FadeUp>

          {/* Right Sidebar stats column */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Streak card */}
            <FadeUp delay={0.1}>
              <div className="rounded-3xl border border-white/[0.08] bg-card/25 backdrop-blur-md p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-orange-500/10 blur-xl group-hover:bg-orange-500/15 transition-all duration-500" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Daily Streak</h4>
                    <p className="text-2xl font-bold mt-1 text-foreground">🔥 {data?.currentStreak} Days</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform duration-300">
                    <Flame className="h-5 w-5 animate-pulse" />
                  </div>
                </div>

                <div className="mt-5 text-xs text-muted leading-relaxed">
                  Best study streak: <span className="font-bold text-foreground">{data?.longestStreak} days</span>. Keep studying to beat your record!
                </div>

                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400 opacity-60" />
              </div>
            </FadeUp>

            {/* Best study day card */}
            <FadeUp delay={0.14}>
              <div className="rounded-3xl border border-white/[0.08] bg-card/25 backdrop-blur-md p-6 shadow-xl relative overflow-hidden trophy-glow-card flex flex-col justify-between h-full min-h-[170px] group">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Best Study Day</h4>
                      <p className="text-lg font-bold mt-1 text-foreground">{bestStudyDay ? bestStudyDay.date : 'No study day'}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>

                  {bestStudyDay ? (
                    <div className="mt-3.5 space-y-2">
                      <div>
                        <span className="text-[10px] text-muted uppercase">Duration:</span>
                        <div className="text-accent font-heading font-black text-xl">{bestStudyDay.hours} hrs</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted uppercase">Subjects:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {bestStudyDay.subjects.map((sub, i) => (
                            <span key={i} className="text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted mt-3">Study at least 5 minutes to record your first best study day.</p>
                  )}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>

        {/* Configure Modal (Glassmorphism UI) */}
        <AnimatePresence>
          {showConfig && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfig(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111111]/90 backdrop-blur-xl p-6 shadow-2xl z-10"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Timer size={18} className="text-accent" />
                    Configure Countdown
                  </h3>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="p-1 rounded-full hover:bg-white/[0.06] text-muted hover:text-foreground cursor-pointer transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                      Exam Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JEE MAIN, NEET, Semesters"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      required
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={examDateStr}
                      onChange={(e) => setExamDateStr(e.target.value)}
                      required
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl bg-accent text-[#09090b] font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                    >
                      {actionLoading ? 'Saving...' : 'Set Countdown'}
                    </button>
                    
                    {data?.exam && (
                      <button
                        type="button"
                        onClick={handleDeleteExam}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-xs hover:bg-red-500/10 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        Remove Exam
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardPageShell>
  )
}
