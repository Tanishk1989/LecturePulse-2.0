import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Plus } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { cn } from '@/lib/utils'

interface FutureViewSectionProps {
  lectureCount: number
}

// Sub-component to animate rolling stats using spring interpolation
function RollingStat({ from, to, active }: { from: number; to: number; active: boolean }) {
  const spring = useSpring(from, { stiffness: 100, damping: 18 })
  const displayVal = useTransform(spring, (latest) => `${Math.round(latest)}%`)

  useEffect(() => {
    spring.set(active ? to : from)
  }, [active, spring, from, to])

  return <motion.span>{displayVal}</motion.span>
}

export function FutureViewSection({ lectureCount }: FutureViewSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Mouse position relative to card boundaries
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [orbHovered, setOrbHovered] = useState(false)
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number | null>(null)

  // Recalculation pulse stages: 'idle' | 'orb' | 'timeline' | 'score' | 'percentage'
  const [pulseStage, setPulseStage] = useState<'idle' | 'orb' | 'timeline' | 'score' | 'percentage'>('idle')

  // Main prediction syllabus score spring
  const completionSpring = useSpring(0, { stiffness: 50, damping: 15 })
  const completionVal = useTransform(completionSpring, (latest) => `${Math.round(latest)}%`)

  const hasLectures = lectureCount > 0

  useEffect(() => {
    if (hasLectures) {
      // Trigger spring animation for syllabus score on mount
      const timer = setTimeout(() => {
        completionSpring.set(87)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      completionSpring.set(0)
    }
  }, [hasLectures, completionSpring])

  // Recalculation pulse cascade every 10 seconds
  useEffect(() => {
    if (!hasLectures) return

    const interval = setInterval(() => {
      setPulseStage('orb')
      
      const t1 = setTimeout(() => setPulseStage('timeline'), 300)
      const t2 = setTimeout(() => setPulseStage('score'), 700)
      const t3 = setTimeout(() => setPulseStage('percentage'), 1100)
      const t4 = setTimeout(() => setPulseStage('idle'), 2200)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [hasLectures])

  // Generate ambient background floating particles
  const bgParticles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      startX: Math.random() * 100,
      startY: Math.random() * 100,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * -20,
    }))
  }, [])

  // Header 🔮 Sparkles
  const headerParticles = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      delay: i * 0.8,
      duration: 2.5,
    }))
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    
    // Relative coordinates (0 to 100)
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })

    // 3D Tilt calculation (max 1.5 degrees)
    const tiltX = -((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 1.5
    const tiltY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 1.5
    setTilt({ x: tiltX, y: tiltY })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setTilt({ x: 0, y: 0 })
    setMousePos({ x: 50, y: 50 })
  }

  // Calculate slight shift of the Orb towards the cursor
  const orbTranslate = useMemo(() => {
    if (!isHovered) return { x: 0, y: 0 }
    return {
      x: (mousePos.x - 50) * 0.15, // max 7.5px shift
      y: (mousePos.y - 50) * 0.15,
    }
  }, [isHovered, mousePos])

  return (
    <FadeUp delay={0.05}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(163, 255, 18, 0.11), transparent 45%), rgba(255, 255, 255, 0.02)`,
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out, background 0.1s ease-out',
        }}
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-white/[0.08] p-6 md:p-8 backdrop-blur-xl shadow-xl min-h-[260px] flex flex-col justify-between select-none group",
          pulseStage !== 'idle' ? 'shadow-[0_0_30px_rgba(163,255,18,0.06)] border-accent/20' : ''
        )}
      >
        {/* Ambient floating green stars background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
          {bgParticles.map((p) => (
            <motion.div
              key={p.id}
              style={{
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                width: p.size,
                height: p.size,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute rounded-full bg-accent/40 blur-[1px]"
            />
          ))}
        </div>

        {/* Header Section */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              {/* Rotating Crystal Ball Icon */}
              <div className="relative flex items-center justify-center">
                <span className="text-lg header-icon-rotate inline-block">🔮</span>
                
                {/* Tiny floating particle sparks emitting from icon */}
                {headerParticles.map((hp) => (
                  <motion.div
                    key={hp.id}
                    animate={{
                      y: [-4, -14],
                      x: [0, (Math.random() - 0.5) * 12],
                      opacity: [0, 0.8, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: hp.duration,
                      delay: hp.delay,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                    className="absolute h-1 w-1 rounded-full bg-accent"
                  />
                ))}
              </div>
              
              <h3 className="font-heading text-xs font-black tracking-[0.25em] text-accent uppercase">
                Future View
              </h3>
            </div>
            <span className="text-[10px] md:text-xs text-muted font-medium mt-1">
              Your AI-powered learning forecast
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 grid md:grid-cols-12 gap-6 items-center flex-1 mt-4">
          
          {hasLectures ? (
            /* Predicative Active View */
            <>
              {/* Left Column: Syllabus Prediction */}
              <div className="md:col-span-4 text-left flex flex-col justify-center space-y-1">
                <p className="text-[11px] font-semibold text-muted/80 tracking-wide uppercase">
                  At your current pace...
                </p>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted font-bold block">You will complete</span>
                  <div className="flex items-baseline gap-1.5">
                    <motion.span 
                      style={{
                        textShadow: pulseStage === 'percentage' ? '0 0 20px rgba(163,255,18,0.8)' : 'none',
                      }}
                      className={cn(
                        "text-4xl md:text-5xl font-heading font-black text-foreground transition-all duration-500",
                        pulseStage === 'percentage' ? 'text-accent scale-105' : ''
                      )}
                    >
                      {completionVal}
                    </motion.span>
                    <span className="text-xs text-muted font-semibold">of syllabus</span>
                  </div>
                </div>
                
                {/* Date sliding upward on load */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  style={{
                    textShadow: pulseStage === 'score' ? '0 0 15px rgba(163,255,18,0.6)' : 'none',
                  }}
                  className={cn(
                    "text-xs md:text-sm font-bold transition-all duration-500",
                    pulseStage === 'score' ? 'text-accent scale-102' : 'text-foreground'
                  )}
                >
                  by <span className="underline decoration-accent/60 underline-offset-4">July 15, 2026</span>
                </motion.div>
              </div>

              {/* Middle Column: Interactive Timeline & Suggestions */}
              <div className="md:col-span-5 flex flex-col justify-between h-full space-y-5">
                
                {/* Interactive Timeline Layout */}
                <div className="relative py-2 mt-2">
                  <div className="flex justify-between items-center text-[9px] font-bold text-muted uppercase tracking-wider mb-2 select-none">
                    <span>Now</span>
                    <span className={cn("transition-colors duration-500", pulseStage === 'timeline' ? 'text-accent' : '')}>Revision</span>
                    <span>Exam</span>
                  </div>
                  
                  {/* Timeline Line Track */}
                  <div className="h-1 w-full rounded-full bg-white/[0.04] relative">
                    {/* Glowing pulse line track */}
                    <div 
                      className={cn(
                        "absolute inset-y-0 left-0 bg-accent/40 rounded-full transition-all duration-700",
                        pulseStage === 'timeline' ? 'bg-accent shadow-[0_0_10px_rgba(163,255,18,0.7)] w-full' : 'w-[45%]'
                      )}
                    />

                    {/* Nodes */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[15%] h-2.5 w-2.5 rounded-full bg-accent border-2 border-background shadow-md shadow-accent/50" />
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 left-[50%] h-2.5 w-2.5 rounded-full border-2 border-background transition-all duration-500",
                      pulseStage === 'timeline' ? 'bg-accent scale-125 shadow-accent/60' : 'bg-muted shadow-sm'
                    )} />
                    <div className="absolute top-1/2 -translate-y-1/2 left-[85%] h-2.5 w-2.5 rounded-full bg-muted border-2 border-background shadow-sm" />

                    {/* Neon Dot Traveling */}
                    <motion.div
                      animate={{
                        left: ["15%", "85%", "15%"]
                      }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_#A3FF12] flex items-center justify-center"
                    >
                      {/* Trail particles */}
                      <span className="absolute h-1 w-1 bg-accent/80 rounded-full blur-[0.5px] -left-1.5" />
                      <span className="absolute h-0.5 w-0.5 bg-accent/60 rounded-full blur-[0.5px] -left-3" />
                    </motion.div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-bold text-foreground mt-2 px-1">
                    <span className="text-muted/80">Jun 22 <span className="text-accent/90">(72%)</span></span>
                    <span className={cn("transition-all duration-500", pulseStage === 'timeline' ? 'text-accent scale-105' : 'text-muted/80')}>Jul 15 <span className="text-accent/90">(86%)</span></span>
                    <span className="text-muted/80">Aug 3 <span className="text-accent/90">(94%)</span></span>
                  </div>
                </div>

                {/* Suggestions Cards (Study Optimization suggestions) */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div
                    onMouseEnter={() => setHoveredSuggestion(1)}
                    onMouseLeave={() => setHoveredSuggestion(null)}
                    className={cn(
                      "rounded-xl border border-white/[0.04] bg-white/[0.01] p-2 text-left cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08]",
                      hoveredSuggestion === 1 ? 'shadow-md shadow-accent/5' : ''
                    )}
                  >
                    <span className="text-[9px] font-bold text-muted uppercase block tracking-wider">Study +20m/day</span>
                    <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs text-foreground">
                      <span className={cn("text-emerald-400 group-hover:animate-pulse", hoveredSuggestion === 1 ? 'scale-110' : '')}>⬆</span>
                      <span>Completion:</span>
                      <span className={cn("font-bold transition-colors", hoveredSuggestion === 1 ? 'text-accent' : '')}>
                        <RollingStat from={87} to={92} active={hoveredSuggestion === 1} />
                      </span>
                    </div>
                  </div>

                  <div
                    onMouseEnter={() => setHoveredSuggestion(2)}
                    onMouseLeave={() => setHoveredSuggestion(null)}
                    className={cn(
                      "rounded-xl border border-white/[0.04] bg-white/[0.01] p-2 text-left cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08]",
                      hoveredSuggestion === 2 ? 'shadow-md shadow-accent/5' : ''
                    )}
                  >
                    <span className="text-[9px] font-bold text-muted uppercase block tracking-wider">Study 1 Pomodoro</span>
                    <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs text-foreground">
                      <span className={cn("text-emerald-400 group-hover:animate-pulse", hoveredSuggestion === 2 ? 'scale-110' : '')}>⬆</span>
                      <span>Retention:</span>
                      <span className={cn("font-bold transition-colors", hoveredSuggestion === 2 ? 'text-accent' : '')}>
                        <RollingStat from={78} to={86} active={hoveredSuggestion === 2} />
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Empty State View */
            <div className="md:col-span-9 text-left flex flex-col justify-center space-y-4">
              <div>
                <h4 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={16} className="text-accent" />
                  Your future starts here
                </h4>
                <p className="text-xs text-muted max-w-md mt-1 leading-relaxed">
                  Upload lectures to enable completion forecasts, retention tracking, and exam readiness scores.
                </p>
              </div>

              <ul className="grid sm:grid-cols-3 gap-2.5 text-[11px] font-semibold text-muted-secondary">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Completion Date
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Retention Analytics
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Exam Readiness
                </li>
              </ul>

              <Link
                to="/dashboard/upload"
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-[#09090b] hover:opacity-90 transition-all cursor-pointer w-fit shadow-md shadow-accent/20"
              >
                <Plus size={14} />
                <span>Upload Lecture</span>
              </Link>
            </div>
          )}

          {/* Right Column: Floating AI Orb (Rendered in both States) */}
          <div className="md:col-span-3 flex items-center justify-center md:justify-end">
            <div
              onMouseEnter={() => setOrbHovered(true)}
              onMouseLeave={() => setOrbHovered(false)}
              className={cn(
                "relative h-20 w-20 flex items-center justify-center rounded-full transition-all duration-500",
                orbHovered ? 'orb-hovered' : ''
              )}
            >
              {/* Pulse ripple wave circles */}
              <span className="absolute inset-0 rounded-full bg-accent/5 border border-accent/15 animate-ping opacity-60" />
              <span className="absolute -inset-2 rounded-full bg-accent/2 border border-accent/10 animate-pulse opacity-40" />

              {/* Orbiting particles around AI Orb */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-accent/80 blur-[0.5px] orbiting-particle-1 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full bg-accent/60 blur-[0.5px] orbiting-particle-2 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 h-1 w-1 rounded-full bg-accent/90 blur-[0.2px] orbiting-particle-3 -translate-x-1/2 -translate-y-1/2" />
              </div>

              {/* Glowing core representing the Jarvis-style AI */}
              <motion.div
                animate={isHovered ? {
                  x: orbTranslate.x,
                  y: orbTranslate.y,
                } : { x: 0, y: 0 }}
                style={{
                  boxShadow: pulseStage === 'orb' 
                    ? '0 0 50px rgba(163, 255, 18, 0.95), inset 0 0 15px rgba(163, 255, 18, 0.6)' 
                    : orbHovered
                      ? '0 0 35px rgba(163, 255, 18, 0.75), inset 0 0 10px rgba(163, 255, 18, 0.4)'
                      : '0 0 20px rgba(163, 255, 18, 0.35), inset 0 0 6px rgba(163, 255, 18, 0.2)',
                  scale: orbHovered ? 1.15 : pulseStage === 'orb' ? 1.12 : 1.0,
                  borderColor: pulseStage === 'orb' || orbHovered ? 'rgba(163, 255, 18, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                }}
                className={cn(
                  "relative h-16 w-16 rounded-full border bg-gradient-to-br from-accent/20 via-black to-accent/5 backdrop-blur-md flex items-center justify-center transition-all duration-500",
                  pulseStage === 'orb' ? 'brightness-125' : ''
                )}
              >
                {/* Futuristic HUD styling inside core */}
                <div className="absolute inset-2.5 rounded-full border border-accent/20 border-dashed animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-accent/40 animate-[spin_6s_linear_infinite_reverse]" />
                <div className="h-3.5 w-3.5 rounded-full bg-accent shadow-[0_0_10px_#A3FF12] animate-pulse" />
              </motion.div>

            </div>
          </div>

        </div>

      </div>
    </FadeUp>
  )
}
