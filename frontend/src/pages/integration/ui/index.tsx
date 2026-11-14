import { useLearningLanguage } from '@/shared/learning-language';

import { McpSettings } from './mcp-settings';

export const IntegrationPage = () => {
  const { language } = useLearningLanguage();
  return <McpSettings key={language} />;
};
