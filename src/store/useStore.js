import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Auth
  currentUnit: null,
  isAdmin: false,
  isSenior: false,

  setUnit: (unit) => set({
    currentUnit: unit,
    isAdmin: unit?.is_admin || false,
    isSenior: unit?.is_senior || false,
  }),
  logout: () => set({ currentUnit: null, isAdmin: false, isSenior: false }),

  // Active page
  activePage: 'dashboard',
  setPage: (page) => set({ activePage: page }),

  // Toast
  toast: null,
  showToast: (msg, type = 'gold') => {
    set({ toast: { msg, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
