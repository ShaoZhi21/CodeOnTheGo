import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        presentation: 'card',
        gestureDirection: 'horizontal',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="lesson" />
      <Stack.Screen name="LessonMCQ" />
      <Stack.Screen name="question" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="roadmaptopic" />
      <Stack.Screen name="allquestions" />
      <Stack.Screen name="quizselection" />
      <Stack.Screen name="randomquestion" />
      <Stack.Screen name="tournament" />
      <Stack.Screen name="duel" />
      <Stack.Screen name="PseudocodeComplete" />
      <Stack.Screen name="LoadingLesson" />
      <Stack.Screen name="LoadingQuestion" />
    </Stack>
  );
} 