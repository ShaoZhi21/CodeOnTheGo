import React, { createContext, useContext, useRef, useState } from 'react';

interface StreakContextType {
  showStreakAnimation: (streakCount?: number) => void;
  isAnimationPlaying: boolean;
  streakAnimationVisible: boolean;
  currentStreakCount: number;
  hideStreakAnimation: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function useStreak() {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
}

interface StreakProviderProps {
  children: React.ReactNode;
}

export function StreakProvider({ children }: StreakProviderProps) {
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [streakAnimationVisible, setStreakAnimationVisible] = useState(false);
  const [currentStreakCount, setCurrentStreakCount] = useState(1);
  
  // Use ref to track animation timeout to prevent duplicate animations
  const animationTimeoutRef = useRef<number | null>(null);

  const showStreakAnimation = (streakCount: number = 1) => {
    // Prevent duplicate animations
    if (isAnimationPlaying) {
      console.log('🎯 Streak animation already playing, skipping duplicate');
      return;
    }

    console.log('🎉 Triggering streak animation with count:', streakCount);
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Set animation state
    setCurrentStreakCount(streakCount);
    setIsAnimationPlaying(true);
    setStreakAnimationVisible(true);

    // Auto-hide after animation duration (3 seconds total)
    animationTimeoutRef.current = setTimeout(() => {
      hideStreakAnimation();
    }, 3000);
  };

  const hideStreakAnimation = () => {
    console.log('🎯 Hiding streak animation');
    setStreakAnimationVisible(false);
    
    // Small delay before allowing next animation
    setTimeout(() => {
      setIsAnimationPlaying(false);
    }, 500);

    // Clear timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  };

  const value: StreakContextType = {
    showStreakAnimation,
    isAnimationPlaying,
    streakAnimationVisible,
    currentStreakCount,
    hideStreakAnimation,
  };

  return (
    <StreakContext.Provider value={value}>
      {children}
    </StreakContext.Provider>
  );
} 