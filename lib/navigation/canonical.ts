import { getStringParamFallback, getJsonParam } from './params';

export type NavParams = Record<string, unknown>;

export function getSource(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['source', 'from']);
}

export function getTopicName(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['topicName', 'topic']);
}

export function getPlanId(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['planId']);
}

export function getProblemId(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['problemId', 'id', 'questionId']);
}

export function getProblemTitle(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['title', 'problemTitle', 'questionTitle', 'name']);
}

export function getDifficulty(params: NavParams): string | undefined {
  return getStringParamFallback(params, ['difficulty', 'questionDifficulty', 'questionDifficultyLevel']);
}

export function getExamples<T = unknown>(params: NavParams): T | undefined {
  return getJsonParam<T>(params, 'examples');
}

export function getConstraints<T = unknown>(params: NavParams): T | undefined {
  return getJsonParam<T>(params, 'constraints');
}

