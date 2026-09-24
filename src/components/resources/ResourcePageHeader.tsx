import React from 'react';

import { PageHeader } from '@/src/components/ui/PageHeader';

type ResourcePageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle?: string;
  onBackPress: () => void;
  backLabel?: string;
  illustration?: React.ReactNode;
  rightElement?: React.ReactNode;
};

export function ResourcePageHeader({ language, title, subtitle, onBackPress, backLabel, illustration, rightElement }: ResourcePageHeaderProps) {
  return (
    <PageHeader
      language={language}
      title={title}
      subtitle={subtitle}
      onBackPress={onBackPress}
      backLabel={backLabel}
      illustration={illustration}
      rightElement={rightElement}
    />
  );
}
