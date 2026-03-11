import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        presentation: 'card',
        gestureDirection: 'horizontal',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="lesson" />
      <Stack.Screen name="LessonMCQ" />
      <Stack.Screen name="question" />
      <Stack.Screen name="quizMCQ" />
      <Stack.Screen name="roadmaptopic" />
      <Stack.Screen name="quizselection" />
      <Stack.Screen name="randomquestion" />
      <Stack.Screen name="PseudocodeComplete" />
      <Stack.Screen name="QuizComplete" />
      <Stack.Screen name="RecapQuizComplete" />
      <Stack.Screen name="codeSummary" />
      <Stack.Screen name="LoadingCodeSummary" />
      <Stack.Screen name="LoadingLesson" />
      <Stack.Screen name="LoadingQuestion" />
      <Stack.Screen name="LoadingRoadMap" />
      <Stack.Screen name="LoadingQuiz" />
      <Stack.Screen name="StudyPlanDetail" />
      <Stack.Screen name="TeachingPage" />
      <Stack.Screen name="StreakAnimation" />
      <Stack.Screen name="dailyRoulette" />
      <Stack.Screen name="pseudoToCode" />
    </Stack>
  );
} 