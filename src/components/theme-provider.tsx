import { createContext, useContext, useEffect, useState } from "react"

export const themeStorageKey = "theme"

export type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",t==="dark"||(t!=="light"&&d));}catch(e){}})();`

function resolvedTheme(theme: Theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return theme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = themeStorageKey,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (isTheme(stored) && stored !== theme) {
      setTheme(stored)
    }
  }, [storageKey, theme])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function apply() {
      const stored = localStorage.getItem(storageKey)
      const active = isTheme(stored) ? stored : theme
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme(active))
    }

    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [storageKey, theme])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (next) => {
          localStorage.setItem(storageKey, next)
          setTheme(next)
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
