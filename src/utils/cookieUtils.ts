'use client';

import Cookies from 'js-cookie';
import { StudySet } from '@/types/studyTypes';

const COOKIE_KEY = 'studyBuddy_session';
const COOKIE_EXPIRATION_DAYS = 7;

/**
 * Save study session to a cookie
 */
export const saveSessionToCookie = (studySet: StudySet): void => {
  try {
    if (!studySet.settings.persistSession) {
      // If persistence is disabled, clear any existing cookie
      Cookies.remove(COOKIE_KEY);
      return;
    }

    const serializedData = JSON.stringify(studySet);
    Cookies.set(COOKIE_KEY, serializedData, { 
      expires: COOKIE_EXPIRATION_DAYS,
      sameSite: 'strict'
    });
  } catch (error) {
    console.error('Failed to save session to cookie:', error);
  }
};

/**
 * Load study session from cookie
 */
export const loadSessionFromCookie = (): StudySet | null => {
  try {
    const cookieData = Cookies.get(COOKIE_KEY);
    
    if (!cookieData) {
      return null;
    }
    
    const parsedData = JSON.parse(cookieData) as StudySet;
    return parsedData;
  } catch (error) {
    console.error('Failed to load session from cookie:', error);
    // If there's an error loading, clear the corrupted cookie
    Cookies.remove(COOKIE_KEY);
    return null;
  }
};

/**
 * Clear the session cookie
 */
export const clearSessionCookie = (): void => {
  Cookies.remove(COOKIE_KEY);
}; 