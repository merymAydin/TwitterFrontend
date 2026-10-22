import { createContext, useContext, useState, useCallback } from 'react';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);

  const openAssistant = useCallback((tweet) => {
    setSelectedTweet(tweet);
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
    setSelectedTweet(null);
  }, []);

  // Clears only the active tweet context while keeping the panel open.
  const clearContext = useCallback(() => {
    setSelectedTweet(null);
  }, []);

  const value = { isOpen, selectedTweet, openAssistant, closeAssistant, clearContext };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}

