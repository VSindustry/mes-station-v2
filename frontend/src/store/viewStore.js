import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useViewStore = create(
  persist(
    (set) => ({
      viewMode: 'desktop',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'mes-view',
    }
  )
)

export default useViewStore