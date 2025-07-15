import LoadingScreen from '@/app/screens/LoadingQuestion';
import { router, useLocalSearchParams } from 'expo-router';

export default function LoadingRoute() {
  const params = useLocalSearchParams();
  
  return (
    <LoadingScreen 
      problemId={params.problemId as string}
      onDataFetched={(data) => {
        console.log('📊 Loading: Problem data fetched:', data);
      }}
      onLoadingComplete={() => {
        // Replace the current screen with the question screen
        router.replace({
          pathname: '/screens/question',
          params: {
            id: params.problemId as string,
            name: params.questionTitle as string,
            difficulty: params.questionDifficulty as string
          }
        });
      }}
      onProgressUpdate={(progress) => {
        console.log(`📊 Loading: Progress: ${progress}%`);
      }}
      loadingDuration={5000}
    />
  );
} 