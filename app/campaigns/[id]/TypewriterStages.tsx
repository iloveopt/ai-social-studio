'use client'

import { useEffect, useState } from 'react'

// 循环打字机：依次打出每段 stage 文案，holdMs 后清空切到下一段
export function TypewriterStages({
  stages,
  charDelay = 40,
  holdMs = 900,
  cursorClassName = 'bg-gray-400',
}: {
  stages: string[]
  charDelay?: number
  holdMs?: number
  cursorClassName?: string
}) {
  const [stageIdx, setStageIdx] = useState(0)
  const [text, setText] = useState('')

  useEffect(() => {
    const stage = stages[stageIdx % stages.length]
    if (text.length < stage.length) {
      const t = setTimeout(() => setText(stage.slice(0, text.length + 1)), charDelay)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setText('')
      setStageIdx((i) => i + 1)
    }, holdMs)
    return () => clearTimeout(t)
  }, [text, stageIdx, stages, charDelay, holdMs])

  return (
    <span>
      {text}
      <span className={`ml-0.5 inline-block w-[2px] h-[1em] align-middle animate-pulse ${cursorClassName}`} />
    </span>
  )
}
