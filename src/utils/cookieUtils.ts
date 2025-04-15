'use client';

import Cookies from 'js-cookie';
import { StudySet } from '@/types/studyTypes';

const COOKIE_KEY_PREFIX = 'studyBuddy_session_';
const SESSIONS_LIST_KEY = 'studyBuddy_sessions';
const COOKIE_EXPIRATION_DAYS = 7;
const MAX_COOKIE_SIZE = 4000; // Bytes

// Constants for API Key storage
const AI_API_KEY_COOKIE = 'studyBuddy_ai_api_key';
const AI_MODEL_PREFERENCE_COOKIE = 'studyBuddy_ai_model_preference';

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__studyBuddy_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Save study session to a cookie or localStorage if too large
 */
export const saveSessionToCookie = (studySet: StudySet): void => {
  try {
    if (!studySet.id) {
      console.error('Cannot save study set without ID');
      return;
    }

    if (!studySet.settings.persistSession) {
      // If persistence is disabled, remove this specific session
      removeStudySet(studySet.id);
      return;
    }

    const sessionKey = `${COOKIE_KEY_PREFIX}${studySet.id}`;
    const serializedData = JSON.stringify(studySet);
    
    // Check if serialized data is too large for cookie
    if (serializedData.length > MAX_COOKIE_SIZE) {
      console.warn(`Study set too large (${serializedData.length} bytes). Using localStorage as fallback.`);
      
      // Try to use localStorage if available
      if (isLocalStorageAvailable()) {
        localStorage.setItem(sessionKey, serializedData);
        
        // Update the sessions list
        let sessionsList = getSessionsList();
        if (!sessionsList.includes(studySet.id)) {
          sessionsList.push(studySet.id);
          Cookies.set(SESSIONS_LIST_KEY, JSON.stringify(sessionsList), { 
            expires: COOKIE_EXPIRATION_DAYS,
            sameSite: 'strict'
          });
          console.log(`Added study set ${studySet.id} to sessions list using localStorage. Total sessions: ${sessionsList.length}`);
        }
        return;
      } else {
        console.error('Study set too large for cookies and localStorage is not available');
      }
    }
    
    // Save the individual study set to cookie if not too large
    Cookies.set(sessionKey, serializedData, { 
      expires: COOKIE_EXPIRATION_DAYS,
      sameSite: 'strict'
    });
    
    // Update the sessions list
    const sessionsList = getSessionsList();
    if (!sessionsList.includes(studySet.id)) {
      sessionsList.push(studySet.id);
      Cookies.set(SESSIONS_LIST_KEY, JSON.stringify(sessionsList), { 
        expires: COOKIE_EXPIRATION_DAYS,
        sameSite: 'strict'
      });
      console.log(`Added study set ${studySet.id} to sessions list. Total sessions: ${sessionsList.length}`);
    }
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

/**
 * Load a specific study session from cookie or localStorage
 */
export const loadSessionFromCookie = (id: string): StudySet | null => {
  try {
    const sessionKey = `${COOKIE_KEY_PREFIX}${id}`;
    
    // Try cookies first
    let cookieData: string | undefined | null = Cookies.get(sessionKey);
    
    // If not in cookies, check localStorage
    if (!cookieData && isLocalStorageAvailable()) {
      cookieData = localStorage.getItem(sessionKey);
      if (cookieData) {
        console.log(`Loaded study set ${id} from localStorage`);
      }
    }
    
    if (!cookieData) {
      return null;
    }
    
    const parsedData = JSON.parse(cookieData) as StudySet;
    return parsedData;
  } catch (error) {
    console.error(`Failed to load session ${id}:`, error);
    // If there's an error loading, clear the corrupted data
    removeStudySet(id);
    return null;
  }
};

/**
 * Get the current active study session (legacy support)
 */
export const getCurrentSession = (): StudySet | null => {
  const sessionsList = getSessionsList();
  if (sessionsList.length === 0) return null;
  
  // Try to get the most recently accessed session
  for (const id of sessionsList) {
    const session = loadSessionFromCookie(id);
    if (session) return session;
  }
  
  return null;
};

/**
 * Get list of all saved study set IDs
 */
export const getSessionsList = (): string[] => {
  try {
    const listData = Cookies.get(SESSIONS_LIST_KEY);
    if (!listData) return [];
    return JSON.parse(listData) as string[];
  } catch (error) {
    console.error('Failed to load sessions list:', error);
    return [];
  }
};

/**
 * Load all saved study sessions
 */
export const loadAllSessions = (): StudySet[] => {
  const sessionIds = getSessionsList();
  const sessions: StudySet[] = [];
  
  for (const id of sessionIds) {
    const session = loadSessionFromCookie(id);
    if (session) {
      sessions.push(session);
    }
  }
  
  return sessions;
};

/**
 * Remove a specific study set from both cookie and localStorage
 */
export const removeStudySet = (id: string): void => {
  // Remove the specific cookie
  const sessionKey = `${COOKIE_KEY_PREFIX}${id}`;
  Cookies.remove(sessionKey);
  
  // Also remove from localStorage if available
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(sessionKey);
  }
  
  // Update the sessions list
  const sessionsList = getSessionsList().filter(sessionId => sessionId !== id);
  Cookies.set(SESSIONS_LIST_KEY, JSON.stringify(sessionsList), { 
    expires: COOKIE_EXPIRATION_DAYS,
    sameSite: 'strict'
  });
};

/**
 * Clear all session data from cookies and localStorage
 */
export const clearAllSessionCookies = (): void => {
  const sessionIds = getSessionsList();
  
  // Remove all individual session cookies and localStorage items
  sessionIds.forEach(id => {
    const sessionKey = `${COOKIE_KEY_PREFIX}${id}`;
    Cookies.remove(sessionKey);
    
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(sessionKey);
    }
  });
  
  // Remove the sessions list cookie
  Cookies.remove(SESSIONS_LIST_KEY);
};

/**
 * Save AI API key to cookie
 */
export const saveAIApiKey = (apiKey: string): void => {
  try {
    Cookies.set(AI_API_KEY_COOKIE, apiKey, { 
      expires: 30, // 30 days expiration
      sameSite: 'strict'
    });
  } catch (error) {
    console.error('Failed to save API key:', error);
  }
};

/**
 * Load AI API key from cookie
 */
export const loadAIApiKey = (): string | null => {
  try {
    const apiKey = Cookies.get(AI_API_KEY_COOKIE);
    return apiKey || null;
  } catch (error) {
    console.error('Failed to load API key:', error);
    return null;
  }
};

/**
 * Save preferred AI model to cookie
 */
export const saveAIModelPreference = (model: string): void => {
  try {
    Cookies.set(AI_MODEL_PREFERENCE_COOKIE, model, { 
      expires: 30, // 30 days expiration
      sameSite: 'strict'
    });
  } catch (error) {
    console.error('Failed to save model preference:', error);
  }
};

/**
 * Load preferred AI model from cookie
 */
export const loadAIModelPreference = (): string | null => {
  try {
    const model = Cookies.get(AI_MODEL_PREFERENCE_COOKIE);
    return model || null;
  } catch (error) {
    console.error('Failed to load model preference:', error);
    return null;
  }
}; 