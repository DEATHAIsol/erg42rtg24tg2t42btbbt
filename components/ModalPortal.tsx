'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders modal content at <body>, outside the React tree it was declared in.
 *
 * This is required, not cosmetic: an ancestor with `backdrop-filter`,
 * `transform`, `filter` or `perspective` becomes the containing block for
 * `position: fixed` descendants. The app header uses `backdrop-blur`, so any
 * modal declared inside it was being positioned against the 56px-tall header
 * box instead of the viewport — which clipped it off the top of the screen.
 *
 * Portalling to <body> guarantees overlays are always measured against the
 * viewport, wherever the component happens to be declared.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent the page behind the modal from scrolling while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
