import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  percentage: number;
  backgroundColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 80,
  strokeWidth = 8,
  percentage,
  backgroundColor = '#d4d4d4',
  progressColor = '#6B4EFF',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - percentage / 100);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <Circle
          stroke={progressColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {children}
        </View>
      </View>
    </View>
  );
};

export default CircularProgress;