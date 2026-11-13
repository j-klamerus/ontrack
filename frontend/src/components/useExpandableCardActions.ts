import { useEffect, useId, useState } from 'react'
import type { RefObject } from 'react'

export function useExpandableCardActions(
  cardRef: RefObject<HTMLElement | null>,
  isEditing: boolean,
  initialIsOpen = false
) {
  const [isOpen, setIsOpen] = useState(initialIsOpen)
  const actionsId = useId()

  useEffect(() => {
    if (!isOpen || isEditing) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !cardRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [cardRef, isEditing, isOpen])

  return {
    actionsId,
    isOpen,
    toggle: () => setIsOpen((open) => !open),
    close: () => setIsOpen(false)
  }
}
