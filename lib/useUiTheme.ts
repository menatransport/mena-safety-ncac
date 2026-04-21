"use client";

import { useCallback, useEffect, useState } from "react";

export type UiTheme = "Dark" | "Light";

const THEME_STORAGE_KEY = "uiTheme";
const THEME_EVENT_NAME = "ui-theme-change";
const DEFAULT_THEME: UiTheme = "Dark";

function readStoredTheme(): UiTheme {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "Dark" || stored === "Light" ? stored : DEFAULT_THEME;
}

export function useUiTheme() {
    const [theme, setThemeState] = useState<UiTheme>(() => readStoredTheme());

    const setTheme = useCallback((nextTheme: UiTheme) => {
        setThemeState(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: nextTheme }));
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === "Dark" ? "Light" : "Dark");
    }, [theme, setTheme]);

    useEffect(() => {
        const syncThemeFromStorage = () => {
            setThemeState(readStoredTheme());
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === THEME_STORAGE_KEY) syncThemeFromStorage();
        };

        window.addEventListener("storage", onStorage);
        window.addEventListener(THEME_EVENT_NAME, syncThemeFromStorage);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(THEME_EVENT_NAME, syncThemeFromStorage);
        };
    }, []);

    return {
        theme,
        isDark: theme === "Dark",
        setTheme,
        toggleTheme,
    };
}
