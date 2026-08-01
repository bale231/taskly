import { colorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { updateTheme } from "../api/auth";
import { getCurrentUserJWT } from "../api/auth";
import { getStoredTheme, setStoredTheme } from "../services/storage";

type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  themeLoaded: boolean;
  /**
   * Ricarica il tema dal backend. La webapp lo faceva con un MutationObserver
   * su data-access-token; qui la schermata di login lo chiama dopo il login.
   */
  reloadTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  setTheme: async () => {},
  themeLoaded: false,
  reloadTheme: async () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light");
  const [themeLoaded, setThemeLoaded] = useState(false);

  /** Applica il tema a NativeWind (equivale alla classe su <html>). */
  const applyTheme = useCallback((next: Theme) => {
    setThemeState(next);
    colorScheme.set(next);
  }, []);

  const reloadTheme = useCallback(async () => {
    const user = await getCurrentUserJWT();
    if (user?.theme === "light" || user?.theme === "dark") {
      applyTheme(user.theme);
      await setStoredTheme(user.theme);
    }
    setThemeLoaded(true);
  }, [applyTheme]);

  useEffect(() => {
    const init = async () => {
      // Prima lo storage locale, per un avvio istantaneo senza flash...
      const saved = await getStoredTheme();
      if (saved) applyTheme(saved);

      // ...poi il backend, che è la fonte di verità.
      await reloadTheme();
    };

    init();
  }, [applyTheme, reloadTheme]);

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      applyTheme(newTheme);
      await setStoredTheme(newTheme);
      await updateTheme(newTheme);
    },
    [applyTheme]
  );

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themeLoaded, reloadTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
