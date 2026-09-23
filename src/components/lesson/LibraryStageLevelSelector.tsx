import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { LIBRARY_STAGES, LibraryStage } from '@/src/lib/library-pathway';
import { theme } from '@/src/theme/theme';

type Props = {
  language: 'en' | 'th';
  stage: LibraryStage;
  stages: LibraryStage[];
  level: number | null;
  levels: number[];
  stageOpen?: boolean;
  onToggleStage?: () => void;
  onSelectStage: (stage: LibraryStage) => void;
  onSelectLevel: (level: number) => void;
  freeOnly?: boolean;
  bottomMargin?: number;
};

export function LibraryStageLevelSelector({
  language, stage, stages, level, levels,
  stageOpen, onToggleStage, onSelectStage, onSelectLevel, freeOnly = false, bottomMargin,
}: Props) {
  const th = language === 'th';
  const stageLabel = (value: LibraryStage) => th
    ? ({ Beginner: 'เริ่มต้น', Intermediate: 'ระดับกลาง', Advanced: 'ขั้นสูง', Expert: 'เชี่ยวชาญ' }[value])
    : value.toUpperCase();
  const collapsible = stageOpen !== undefined && Boolean(onToggleStage);

  return (
    <View style={[collapsible ? styles.compactNavigationShadow : styles.navigationShadow, bottomMargin === undefined ? null : { marginBottom: bottomMargin }]}>
      <View style={collapsible ? styles.compactNavigation : styles.navigation}>
        {!collapsible ? (
          <View style={styles.stages}>
            {LIBRARY_STAGES.filter((value) => stages.includes(value)).map((value, index) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: value === stage }}
                onPress={() => onSelectStage(value)}
                style={[styles.stageTouch, index > 0 ? styles.stageDivider : null, value === stage ? styles.activeStage : null]}>
                <AppText
                  language={language}
                  variant="caption"
                  numberOfLines={1}
                  style={[styles.stageName, value === stage ? styles.activeStageText : null]}>
                  {stageLabel(value)}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={th ? 'เลือกช่วงการเรียน' : 'Choose stage'} accessibilityState={{ expanded: stageOpen }} onPress={onToggleStage} style={styles.stageHeader}>
              <View style={styles.stageHeading}>
                <View style={styles.stageDot} />
                <AppText language={language} variant="caption" style={styles.collapsibleStageName}>{stageLabel(stage)}</AppText>
              </View>
              <MaterialIcons name={stageOpen ? 'remove' : 'add'} size={17} color={theme.colors.text} />
            </Pressable>
            {stageOpen ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collapsibleStages}>
                {LIBRARY_STAGES.filter((value) => stages.includes(value)).map((value) => (
                  <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === stage }} onPress={() => onSelectStage(value)} style={styles.collapsibleStageTouch}>
                    <View style={[styles.stagePill, value === stage ? styles.collapsibleActiveStage : null]}>
                      <AppText language={language} variant="caption" style={[styles.collapsibleStageName, value === stage ? styles.collapsibleActiveStageText : null]}>{stageLabel(value)}</AppText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </>
        )}
        {!freeOnly ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelScroll} contentContainerStyle={styles.levels}>
            {levels.map((value, index) => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === level }} onPress={() => onSelectLevel(value)} style={[styles.level, index > 0 ? styles.levelDivider : null, value === level ? styles.activeLevel : null]}>
                <AppText language={language} variant="caption" style={[styles.levelText, value === level ? { fontFamily: theme.typography.fontFaces[language].bold } : null]}>
                  {th ? 'เลเวล' : 'LEVEL'} {value}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationShadow: { alignSelf: 'stretch', backgroundColor: '#222222', borderRadius: 12, marginBottom: 24, marginRight: -2, marginLeft: 2 },
  navigation: { transform: [{ translateX: -2 }, { translateY: -2 }], borderWidth: 1.5, borderColor: '#222222', borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  compactNavigationShadow: { alignSelf: 'stretch', backgroundColor: '#222222', borderRadius: 10, marginBottom: 24, marginRight: -3, marginLeft: 3 },
  compactNavigation: { transform: [{ translateX: -3 }, { translateY: -3 }], borderWidth: 1, borderColor: '#222222', borderRadius: 10, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  stages: { minHeight: 40, flexDirection: 'row', alignItems: 'stretch' },
  stageTouch: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  stageDivider: { borderLeftWidth: 1.5, borderLeftColor: '#222222' },
  stageName: { fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textAlign: 'center', textTransform: 'uppercase' },
  activeStage: { backgroundColor: '#B7E8F8' },
  activeStageText: { fontWeight: theme.typography.weights.bold },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, minHeight: 27 },
  stageHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BCE574' },
  collapsibleStageName: { fontSize: 12, lineHeight: 18, letterSpacing: 0.65, textTransform: 'uppercase' },
  collapsibleStages: { flexGrow: 1, justifyContent: 'space-between', gap: 4, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4 },
  collapsibleStageTouch: { padding: 4, justifyContent: 'center', minHeight: 32 },
  stagePill: { borderRadius: 4, backgroundColor: '#EEEEEE', paddingHorizontal: 5, paddingVertical: 2 },
  collapsibleActiveStage: { backgroundColor: '#2860F0' },
  collapsibleActiveStageText: { color: '#FFFFFF' },
  levelScroll: { borderBottomLeftRadius: 9, borderBottomRightRadius: 9, overflow: 'hidden' },
  levels: { flexGrow: 1 },
  level: { flex: 1, minWidth: 72, minHeight: 36, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderTopWidth: 1, borderColor: '#333333' },
  levelDivider: { borderLeftWidth: 1 },
  activeLevel: { backgroundColor: '#BFEDFC' },
  levelText: { fontSize: 13, lineHeight: 19 },
});
