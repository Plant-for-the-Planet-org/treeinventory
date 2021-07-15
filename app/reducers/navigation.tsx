import React, { createContext, useState } from 'react';

// Creates the context object for Navigation. Used by component to get the state and dispatch function of loading
export const NavigationContext = createContext<any>(null);

// Create a provider for components to consume and subscribe to changes
export const NavigationContextProvider = ({ children }: { children: JSX.Element }) => {
  const [showInitialStack, setShowInitialStack] = useState(true);
  const [initialNavigationScreen, setInitialNavigationScreen] = useState<string>('');
  const [updateSpeciesSync, setUpdateSpeciesSync] = useState<boolean>(false);

  const showInitialNavigationStack = () => setShowInitialStack(true);
  const showMainNavigationStack = () => setShowInitialStack(false);

  // returns a provider used by component to access the state and dispatch function of loading
  return (
    <NavigationContext.Provider
      value={{
        showInitialStack,
        showInitialNavigationStack,
        showMainNavigationStack,
        initialNavigationScreen,
        setInitialNavigationScreen,
        updateSpeciesSync,
        setUpdateSpeciesSync,
      }}>
      {children}
    </NavigationContext.Provider>
  );
};
