import { useCallback } from 'react';
import { useProfileStore } from '../stores/profileStore';
import type { User, UserRole } from '@shared/types/user';

export const useProfile = () => {
  const {
    currentUser,
    availableInstruments,
    setCurrentUser,
    clearCurrentUser,
  } = useProfileStore();

  const createProfile = useCallback(
    (
      name: string,
      role: UserRole,
      instrumentId: string,
      customCommands: string[] = []
    ) => {
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        name,
        role,
        instrumentId,
        customCommands,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentUser(newUser);
      return newUser;
    },
    [setCurrentUser]
  );

  const updateProfile = useCallback(
    (updates: Partial<Omit<User, 'id' | 'createdAt'>>) => {
      if (!currentUser) return null;

      const updatedUser: User = {
        ...currentUser,
        ...updates,
        updatedAt: new Date(),
      };

      setCurrentUser(updatedUser);
      return updatedUser;
    },
    [currentUser, setCurrentUser]
  );

  const getInstrument = useCallback(
    (instrumentId: string) => {
      return availableInstruments.find(
        (instrument) => instrument.id === instrumentId
      );
    },
    [availableInstruments]
  );

  const getCurrentInstrument = useCallback(() => {
    if (!currentUser) return null;
    return getInstrument(currentUser.instrumentId);
  }, [currentUser, getInstrument]);

  return {
    currentUser,
    availableInstruments,
    createProfile,
    updateProfile,
    clearProfile: clearCurrentUser,
    getInstrument,
    getCurrentInstrument,
    isLoggedIn: !!currentUser,
  };
};
