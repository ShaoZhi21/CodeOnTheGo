export const Routes = {
  tabs: {
    root: '/(tabs)' as const,
    home: '/(tabs)' as const,
    learn: '/(tabs)/learn' as const,
    questions: '/(tabs)/questions' as const,
    profile: '/(tabs)/profile' as const,
  },
  screens: {
    roadmapTopic: (args: { topic: string; from?: string; preFetchedData?: string }) => {
      const params = new URLSearchParams({
        topic: args.topic,
        ...(args.from ? { from: args.from } : {}),
        ...(args.preFetchedData ? { preFetchedData: args.preFetchedData } : {}),
      });
      const qs = params.toString();
      return (`/screens/roadmaptopic${qs ? `?${qs}` : ''}`) as const;
    },
    studyPlanDetail: (planId: string) =>
      (`/screens/StudyPlanDetail?planId=${encodeURIComponent(planId)}`) as const,
    loadingLesson: (args: {
      questionId: string;
      problemId?: string;
      questionTitle: string;
      questionDescription: string;
      topicName: string;
      questionDifficulty: string;
      source?: string;
      planId?: string;
    }) => {
      const params = new URLSearchParams({
        questionId: args.questionId,
        problemId: args.problemId ?? args.questionId,
        questionTitle: args.questionTitle,
        questionDescription: args.questionDescription,
        topicName: args.topicName,
        questionDifficulty: args.questionDifficulty,
        ...(args.source ? { source: args.source } : {}),
        ...(args.planId ? { planId: args.planId } : {}),
      });
      return (`/screens/LoadingLesson?${params.toString()}`) as const;
    },
    question: (args: {
      id: string;
      name: string;
      difficulty: string;
      source?: string;
      topicName?: string;
      planId?: string;
    }) => {
      const params = new URLSearchParams({
        id: args.id,
        name: args.name,
        difficulty: args.difficulty,
        ...(args.source ? { source: args.source } : {}),
        ...(args.topicName ? { topicName: args.topicName } : {}),
        ...(args.planId ? { planId: args.planId } : {}),
      });
      return (`/screens/question?${params.toString()}`) as const;
    },
  },
} as const;

