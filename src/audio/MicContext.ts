import { createContext, useContext } from 'react'

/** Live mic loudness ref (0..1), bridged across the R3F renderer boundary. */
export const MicContext = createContext<{ current: number }>({ current: 0 })

export const useMic = () => useContext(MicContext)
