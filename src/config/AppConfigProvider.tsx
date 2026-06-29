import React, {createContext, useContext, useMemo, useState} from 'react';

const DEFAULT_BACKEND_URL = 'https://monstretp.onrender.com';

type AppConfigContextValue = {
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  resetBackendUrl: () => void;
};

const AppConfigContext = createContext<AppConfigContextValue | undefined>(
  undefined,
);

export function AppConfigProvider({children}: {children: React.ReactNode}) {
  const [backendUrl, setBackendUrlState] = useState(DEFAULT_BACKEND_URL);

  const value = useMemo(
    () => ({
      backendUrl,
      setBackendUrl: (url: string) => setBackendUrlState(url.trim()),
      resetBackendUrl: () => setBackendUrlState(DEFAULT_BACKEND_URL),
    }),
    [backendUrl],
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);

  if (!context) {
    throw new Error('useAppConfig must be used inside AppConfigProvider');
  }

  return context;
}
