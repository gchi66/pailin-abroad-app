import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ExerciseBankSectionRoute() {
  const params = useLocalSearchParams<{ categorySlug?: string | string[]; sectionSlug?: string | string[] }>();
  const categorySlug = Array.isArray(params.categorySlug) ? params.categorySlug[0] : params.categorySlug;
  const sectionSlug = Array.isArray(params.sectionSlug) ? params.sectionSlug[0] : params.sectionSlug;

  if (!categorySlug || !sectionSlug) {
    return <Redirect href="/(tabs)/resources/exercise-bank" />;
  }

  return <Redirect href={`/(tabs)/resources/exercise-bank/${categorySlug}/${sectionSlug}`} />;
}
