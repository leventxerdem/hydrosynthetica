import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createProject } from './defaults.js'

const STORAGE_KEY = 'hydrosynthetica.project.v1'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [project, setProjectState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) {
      /* ignore corrupt storage */
    }
    return createProject('HydroSynthetica Project')
  })
  const [isDirty, setIsDirty] = useState(false)
  const saveTimer = useRef(null)

  const updateProject = useCallback((updater) => {
    setProjectState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return { ...next }
    })
    setIsDirty(true)
  }, [])

  // Debounced autosave to localStorage
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
      } catch (e) {
        /* storage full / unavailable */
      }
    }, 300)
    return () => clearTimeout(saveTimer.current)
  }, [project])

  const saveToFile = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}.hydroproj.json`
    a.click()
    URL.revokeObjectURL(url)
    setIsDirty(false)
  }, [project])

  const loadFromFile = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        setProjectState(parsed)
        setIsDirty(false)
      } catch (e) {
        console.error('Failed to parse project file', e)
      }
    }
    reader.readAsText(file)
  }, [])

  const resetProject = useCallback(() => {
    setProjectState(createProject('HydroSynthetica Project'))
    setIsDirty(false)
  }, [])

  return (
    <ProjectContext.Provider
      value={{ project, updateProject, isDirty, setIsDirty, saveToFile, loadFromFile, resetProject }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
