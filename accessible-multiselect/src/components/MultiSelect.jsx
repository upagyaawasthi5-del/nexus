import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import './MultiSelect.css'

/**
 * Accessible multi-select "listbox popup" component, built from scratch
 * (no Radix/MUI/etc), following the ARIA APG Listbox pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * Supports both controlled and uncontrolled usage, the same way a native
 * <input> supports `value` (controlled) and `defaultValue` (uncontrolled):
 *
 *   Controlled:   <MultiSelect options={o} value={vals} onChange={setVals} />
 *   Uncontrolled: <MultiSelect options={o} defaultValue={['a']} />
 *
 * The open listbox is rendered via a portal into document.body and
 * positioned with `position: fixed`, so it can never be clipped or
 * visually covered by sibling elements that create their own stacking
 * context (e.g. another card later in the DOM).
 */
export default function MultiSelect({
  id,
  label,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
}) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? [])
  const selected = isControlled ? value : internalValue

  const setSelected = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(selected) : updater
      if (!isControlled) setInternalValue(next)
      onChange?.(next)
    },
    [isControlled, onChange, selected]
  )

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [coords, setCoords] = useState(null) // { top, left, width } of the trigger, for the portaled listbox

  const generatedId = useId()
  const baseId = id ?? generatedId
  const buttonId = `${baseId}-button`
  const listboxId = `${baseId}-listbox`
  const labelId = `${baseId}-label`
  const getOptionId = (idx) => `${baseId}-option-${idx}`

  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listboxRef = useRef(null)
  const optionRefs = useRef([])
  const typeaheadRef = useRef({ query: '', timeout: null })

  // Close on outside click. Checks both the root (label/chips/trigger) and
  // the portaled listbox, since the listbox no longer lives inside rootRef.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      const inRoot = rootRef.current && rootRef.current.contains(e.target)
      const inListbox = listboxRef.current && listboxRef.current.contains(e.target)
      if (!inRoot && !inListbox) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  // Move DOM focus into the listbox when it opens; restore to the
  // trigger button when it closes. This is the "focus moves into the
  // widget" variant of the listbox pattern (as opposed to
  // aria-activedescendant), which is the most robust with screen readers.
  useEffect(() => {
    if (open) {
      const target = optionRefs.current[activeIndex]
      target?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep the portaled listbox aligned with the trigger while open, in case
  // the page scrolls or resizes underneath it.
  useEffect(() => {
    if (!open) return
    function handleReposition() {
      updateCoords()
    }
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function updateCoords() {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    })
  }

  function openListbox(startIndex) {
    const firstSelected = options.findIndex((o) => selected.includes(o.value))
    const idx = startIndex ?? (firstSelected >= 0 ? firstSelected : 0)
    setActiveIndex(clamp(idx))
    updateCoords()
    setOpen(true)
  }

  function closeListbox({ restoreFocus = true } = {}) {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  function clamp(idx) {
    return Math.max(0, Math.min(options.length - 1, idx))
  }

  function toggleOption(idx) {
    const opt = options[idx]
    if (opt.disabled) return
    setSelected((prev) => {
      const isSelected = prev.includes(opt.value)
      const next = isSelected
        ? prev.filter((v) => v !== opt.value)
        : [...prev, opt.value]
      setAnnouncement(
        `${opt.label} ${isSelected ? 'deselected' : 'selected'}. ${next.length} of ${options.length} selected.`
      )
      return next
    })
  }

  function removeChip(optValue) {
    const opt = options.find((o) => o.value === optValue)
    setSelected((prev) => prev.filter((v) => v !== optValue))
    setAnnouncement(`${opt?.label ?? ''} removed. ${selected.length - 1} of ${options.length} selected.`)
    buttonRef.current?.focus()
  }

  function moveActive(nextIdx) {
    const idx = clamp(nextIdx)
    setActiveIndex(idx)
    optionRefs.current[idx]?.focus()
  }

  function handleButtonKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        e.preventDefault()
        openListbox()
        break
      default:
        break
    }
  }

  function handleListboxKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        moveActive(activeIndex + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        moveActive(activeIndex - 1)
        break
      case 'Home':
        e.preventDefault()
        moveActive(0)
        break
      case 'End':
        e.preventDefault()
        moveActive(options.length - 1)
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        toggleOption(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        closeListbox()
        break
      case 'Tab':
        // Don't trap focus — let it leave naturally, just close.
        setOpen(false)
        break
      default:
        if (e.key.length === 1 && e.key !== ' ') {
          e.preventDefault()
          typeahead(e.key)
        }
        break
    }
  }

  function typeahead(char) {
    const state = typeaheadRef.current
    clearTimeout(state.timeout)
    state.query += char.toLowerCase()
    const startFrom = activeIndex + 1
    const ordered = [
      ...options.slice(startFrom),
      ...options.slice(0, startFrom),
    ]
    const match = ordered.find((o) =>
      o.label.toLowerCase().startsWith(state.query)
    )
    if (match) {
      moveActive(options.indexOf(match))
    }
    state.timeout = setTimeout(() => {
      state.query = ''
    }, 500)
  }

  const summary =
    selected.length === 0
      ? placeholder
      : `${selected.length} selected`

  return (
    <div className="ms-root" ref={rootRef}>
      {label && (
        <span id={labelId} className="ms-label">
          {label}
        </span>
      )}

      {selected.length > 0 && (
        <ul className="ms-chips" aria-label={`Selected: ${selected
          .map((v) => options.find((o) => o.value === v)?.label)
          .join(', ')}`}>
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v)
            if (!opt) return null
            return (
              <li key={v} className="ms-chip">
                <span>{opt.label}</span>
                <button
                  type="button"
                  className="ms-chip-remove"
                  aria-label={`Remove ${opt.label}`}
                  onClick={() => removeChip(v)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        id={buttonId}
        ref={buttonRef}
        className="ms-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={label ? `${labelId} ${buttonId}` : undefined}
        onClick={() => (open ? closeListbox() : openListbox())}
        onKeyDown={handleButtonKeyDown}
      >
        {summary}
        <span className="ms-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && coords && createPortal(
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={label ? labelId : undefined}
          className="ms-listbox"
          style={{
            position: 'fixed',
            top: coords.top + 6,
            left: coords.left,
            width: coords.width,
          }}
          onKeyDown={handleListboxKeyDown}
        >
          {options.map((opt, idx) => {
            const isSelected = selected.includes(opt.value)
            return (
              <li
                key={opt.value}
                id={getOptionId(idx)}
                ref={(el) => (optionRefs.current[idx] = el)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                tabIndex={idx === activeIndex ? 0 : -1}
                className={`ms-option${idx === activeIndex ? ' is-active' : ''}${
                  opt.disabled ? ' is-disabled' : ''
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  if (opt.disabled) return
                  setActiveIndex(idx)
                  toggleOption(idx)
                  optionRefs.current[idx]?.focus()
                }}
              >
                <span className="ms-checkbox" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
                {opt.label}
              </li>
            )
          })}
        </ul>,
        document.body
      )}

      {/* Visually hidden live region for selection announcements */}
      <div className="ms-sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  )
}