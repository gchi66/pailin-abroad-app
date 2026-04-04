import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TopicDetailRoute() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  return <Redirect href={slug ? `/(tabs)/resources/topic-library/${slug}` : '/(tabs)/resources/topic-library'} />;
}
