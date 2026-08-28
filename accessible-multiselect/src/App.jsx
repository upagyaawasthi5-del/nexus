import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import MultiSelect from './components/MultiSelect'
import IridescentShapeScene from './components/IridescentShapes'
import './App.css'

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'SolidJS' },
  { value: 'angular', label: 'Angular' },
  { value: 'ember', label: 'Ember (legacy)', disabled: true },
  { value: 'preact', label: 'Preact' },
]

const KEY_MAP = [
  { keys: ['↓', '↑'], action: 'Move focus to the next / previous option' },
  { keys: ['Home'], action: 'Jump to the first option' },
  { keys: ['End'], action: 'Jump to the last option' },
  { keys: ['Space', 'Enter'], action: 'Toggle the focused option' },
  { keys: ['Esc'], action: 'Close the list, return focus to the trigger' },
  { keys: ['A', '–', 'Z'], action: 'Type-ahead: jump to a matching label' },
]

function SortableItem({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease, border-color 0.2s ease',
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? 'relative' : 'static',
  }

  return (
    <div ref={setNodeRef} style={style} className={`sortable-item ${isDragging ? 'is-dragging' : ''}`}>
      <div className="sortable-drag-handle" {...attributes} {...listeners} aria-label={`Drag ${label} to reorder`}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </div>
      <span className="sortable-label">{label}</span>
    </div>
  )
}

function App() {
  const [controlledValue, setControlledValue] = useState(['react', 'vue'])
  const [reorderableItems, setReorderableItems] = useState(() => FRAMEWORKS.filter(f => !f.disabled))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setReorderableItems((items) => {
        const oldIndex = items.findIndex(item => item.value === active.id)
        const newIndex = items.findIndex(item => item.value === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="app-wrapper">
      
      {/* --- VIDEO BACKGROUND --- */}
      <div className="ambient-background">
        <video autoPlay loop muted playsInline className="video-background">
          <source src="/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay"></div>
      </div>

      <div className="console animate-on-load">
        <div className="console-titlebar">
          <img src="/logo3.png" alt="Project Logo" className="console-logo" />
          <span className="console-dot" aria-hidden="true" />
          <span className="console-dot" aria-hidden="true" />
          <span className="console-dot" aria-hidden="true" />
        </div>

        <main className="console-body">
          
          {/* HERO SECTION - PYRAMID */}
          <section className="hero animate-stagger-1 split-section">
            <div className="split-content">
              <p className="eyebrow">Nexus UI Framework</p>
              <h1>Next-Gen<br />
                <span className="text-gradient">Interactivity.</span>
              </h1>
              <p className="hero-sub">
                A premium, high-performance UI toolkit featuring accessible multiselects, 
                spatial drag-and-drop sorting, and seamless glassmorphic rendering.
              </p>
            </div>
            <div className="split-3d">
              <IridescentShapeScene shape="pyramid" />
            </div>
          </section>

          {/* DEMO SECTION - CUBE */}
          <section className="demo-section animate-stagger-2 split-section reverse">
            <div className="split-content">
              <h2 className="section-heading">Form Controls</h2>
              <div className="ms-demo-grid">
                <div className="demo-card interactive-card">
                  <p className="demo-card-label">Uncontrolled</p>
                  <MultiSelect id="frameworks-uncontrolled" label="Favorite frameworks" options={FRAMEWORKS} defaultValue={['svelte']} />
                </div>

                <div className="demo-card interactive-card">
                  <p className="demo-card-label">Controlled</p>
                  <MultiSelect id="frameworks-controlled" label="Favorite frameworks (controlled)" options={FRAMEWORKS} value={controlledValue} onChange={setControlledValue} />
                  <button type="button" className="ghost-button" onClick={() => setControlledValue([])}>
                    Clear from parent
                  </button>
                </div>
              </div>
            </div>
            <div className="split-3d">
              <IridescentShapeScene shape="cube" />
            </div>
          </section>

          {/* DRAG & DROP SECTION - LAYERS */}
          <section className="demo-section animate-stagger-3 split-section">
            <div className="split-content">
              <h2 className="section-heading">Spatial Sorting</h2>
              <div className="demo-card interactive-card">
                <p className="demo-card-label">Rank your frameworks</p>
                <p className="demo-card-note" style={{ marginBottom: '1.5rem' }}>
                  Accessible drag-and-drop using <code>@dnd-kit</code>. Try sorting with your keyboard.
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={reorderableItems.map(item => item.value)} strategy={verticalListSortingStrategy}>
                    <div role="list" className="sortable-list-container">
                      {reorderableItems.map((framework) => (
                        <SortableItem key={framework.value} id={framework.value} label={framework.label} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
            <div className="split-3d">
              <IridescentShapeScene shape="layers" />
            </div>
          </section>

          {/* KEYMAP SECTION */}
          <section className="keymap-section animate-stagger-4">
            <h2 className="section-heading">Keyboard Mapping</h2>
            <dl className="keymap">
              {KEY_MAP.map((row) => (
                <div className="keymap-row" key={row.action}>
                  <dt className="keymap-keys">
                    {row.keys.map((k, i) => (
                      <span key={k + i}>
                        {i > 0 && k !== '–' ? <span className="keymap-plus">/</span> : null}
                        {k === '–' ? <span className="keymap-through">–</span> : <kbd>{k}</kbd>}
                      </span>
                    ))}
                  </dt>
                  <dd className="keymap-action">{row.action}</dd>
                </div>
              ))}
            </dl>
          </section>

        </main>
      </div>
    </div>
  )
}

export default App