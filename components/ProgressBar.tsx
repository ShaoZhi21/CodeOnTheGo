import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface ProgressBarProps {
  score: number; // Score out of 100
  compact?: boolean; // For smaller width in modal
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ score, compact = false }) => {
  // Ensure score is between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score));
  const progressPercentage = clampedScore;

  // Calculate dynamic colors based on score
  const getProgressColors = (score: number) => {
    if (score <= 30) {
      // Red range (0-30) - darker red for higher scores in this range
      const intensity = score / 30; // 0 to 1
      return {
        fill: score < 15 ? '#DC2626' : '#B91C1C', // Lighter to darker red
        border: score < 15 ? '#B91C1C' : '#991B1B', // Darker border
        shadow: '#DC2626'
      };
    } else if (score <= 60) {
      // Orange range (30-60) - transition from red to orange, darker for higher scores
      const progress = (score - 30) / 30; // 0 to 1
      const isHigher = score > 45;
      return {
        fill: isHigher ? '#EA580C' : '#F97316', // Orange variants
        border: isHigher ? '#C2410C' : '#EA580C', // Darker orange borders
        shadow: '#F97316'
      };
    } else {
      // Green range (60-100) - darker green for higher scores
      const intensity = (score - 60) / 40; // 0 to 1
      return {
        fill: score < 80 ? '#22C55E' : '#16A34A', // Lighter to darker green
        border: score < 80 ? '#16A34A' : '#15803D', // Darker green borders
        shadow: '#22C55E'
      };
    }
  };

  const colors = getProgressColors(clampedScore);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Progress bar container */}
      <View style={styles.progressBarContainer}>
        {/* Background bar with gradient effect */}
        <View style={styles.backgroundBar}>
          <View style={styles.backgroundGradient} />
        </View>
        
        {/* Progress fill with dynamic colors */}
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${progressPercentage}%`,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              minWidth: clampedScore === 0 ? 12 : 20, // Small rounded indicator for score 0
            }
          ]} 
        >
          <View style={[styles.progressGradient, { backgroundColor: colors.fill }]} />
        </View>
        
        {/* Dashed lines at 25%, 50%, 75% */}
        <View style={[styles.dashLine, { left: '25%' }]} />
        <View style={[styles.dashLine, { left: '50%' }]} />
        <View style={[styles.dashLine, { left: '75%' }]} />
        
        {/* Progress markers */}
        <ThemedText style={[styles.marker, { left: '0%' }]}>0</ThemedText>
        <ThemedText style={[styles.marker, { left: '22%' }]}>25</ThemedText>
        <ThemedText style={[styles.marker, { left: '47%' }]}>50</ThemedText>
        <ThemedText style={[styles.marker, { left: '72%' }]}>75</ThemedText>
        <ThemedText style={[styles.marker, { left: '96%' }]}>100</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  compactContainer: {
    width: '80%',
    alignSelf: 'center',
  },
  progressBarContainer: {
    height: 40,
    position: 'relative',
    justifyContent: 'center',
  },
  backgroundBar: {
    height: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    position: 'absolute',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backgroundGradient: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  progressFill: {
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
    position: 'absolute',
    minWidth: 20, // This will be overridden dynamically
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 10,
    // backgroundColor will be set dynamically
  },
  dashLine: {
    position: 'absolute',
    width: 2,
    height: 26,
    backgroundColor: '#64748B',
    top: -1,
    borderRadius: 1,
    opacity: 0.6,
  },
  marker: {
    position: 'absolute',
    fontSize: 11,
    color: '#475569',
    top: -14,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 20,
    transform: [{ translateX: -10 }], // Center the text
  },
}); 