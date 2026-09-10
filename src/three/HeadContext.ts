import { createContext, useContext } from 'react'
import type { HeadRef } from '../hooks/useHeadTracking'

export const HeadContext = createContext<{ current: HeadRef }>({
  current: { x: 0, y: 0, z: 0.6 },
})

export const useHead = () => useContext(HeadContext)
