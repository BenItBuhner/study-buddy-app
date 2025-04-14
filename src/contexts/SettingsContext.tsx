'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StudySettings } from '@/types/studyTypes';

// Default settings
const defaultSettings: StudySettings = {
  persistSession: true,
};

// Context type
interface SettingsContextType {
  settings: StudySettings;
  updateSettings: (newSettings: Partial<StudySettings>) => void;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StudySettings>(defaultSettings);

  // Update settings
  const updateSettings = (newSettings: Partial<StudySettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use the settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
} 