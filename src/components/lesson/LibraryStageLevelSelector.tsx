import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';
import { AnimatedPlusMinus, DisclosureContent } from '@/src/components/ui/MotionEffects';
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

function IntermediateLabel({ selected }: { selected: boolean }) {
  const fontFamily = theme.typography.fontFaces.en[selected ? 'bold' : 'medium'];
  const [availableWidth, setAvailableWidth] = useState(0);
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});
  const naturalWidth = measuredWidths[fontFamily] ?? 0;
  const ready = availableWidth > 0 && naturalWidth > 0;
  // Fit width only. Native auto-fitting also considers line height and can over-shrink on iOS.
  // Leave one point for native glyph/pixel rounding; always measure at the original size.
  const scale = ready ? Math.min(1, Math.max(0, availableWidth - 1) / naturalWidth) : 1;

  return (
    <View style={styles.intermediateLabel} onLayout={({ nativeEvent }) => setAvailableWidth(nativeEvent.layout.width)}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.labelMeasurement}>
        <Text
          key={fontFamily}
          accessible={false}
          allowFontScaling={false}
          numberOfLines={1}
          onLayout={({ nativeEvent }) => {
            const width = nativeEvent.layout.width;
            if (width > 0) setMeasuredWidths((previous) => previous[fontFamily] === width ? previous : { ...previous, [fontFamily]: width });
          }}
          style={[styles.stageName, styles.intrinsicLabel, { fontFamily }]}>
          INTERMEDIATE
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.stageName, {
          fontFamily,
          fontSize: styles.stageName.fontSize * scale,
          letterSpacing: styles.stageName.letterSpacing * scale,
          opacity: ready ? 1 : 0,
        }]}>
        INTERMEDIATE
      </Text>
    </View>
  );
}

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
    <View style={[
      collapsible ? styles.compactNavigationShadow : styles.navigationShadow,
      bottomMargin === undefined ? null : { marginBottom: bottomMargin },
    ]}>
      <View style={collapsible ? styles.compactNavigation : styles.navigation}>
        {!collapsible ? (
          <View style={styles.stages}>
            {LIBRARY_STAGES.filter((value) => stages.includes(value)).map((value, index) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={stageLabel(value)}
                accessibilityState={{ selected: value === stage }}
                onPress={() => onSelectStage(value)}
                style={[styles.stageTouch, value === stage ? styles.activeStage : null]}>
                {index > 0 ? <View pointerEvents="none" style={styles.stageDivider} /> : null}
                {!th && value === 'Intermediate' ? <IntermediateLabel selected={value === stage} /> : <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[
                    styles.stageName,
                    { fontFamily: theme.typography.fontFaces[language][value === stage ? 'bold' : 'medium'] },
                  ]}>
                  {stageLabel(value)}
                </Text>}
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
              <AnimatedPlusMinus expanded={stageOpen} size={11} color={theme.colors.text} />
            </Pressable>
            {stageOpen ? (
              <DisclosureContent>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collapsibleStages}>
                  {LIBRARY_STAGES.filter((value) => stages.includes(value)).map((value) => (
                    <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === stage }} onPress={() => onSelectStage(value)} style={[styles.collapsibleStageTouch, th ? styles.collapsibleStageTouchThai : null]}>
                      <View style={[styles.stagePill, th ? styles.stagePillThai : null, value === stage ? styles.collapsibleActiveStage : null]}>
                        <AppText language={language} variant="caption" style={[styles.collapsibleStageName, value === stage ? styles.collapsibleActiveStageText : null]}>{stageLabel(value)}</AppText>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </DisclosureContent>
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
  navigationShadow: { alignSelf: 'stretch', borderRadius: 8, marginBottom: 24, boxShadow: '2px 3px 0px #222222' },
  navigation: { borderWidth: 1.5, borderColor: '#222222', borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  compactNavigationShadow: { alignSelf: 'stretch', backgroundColor: '#222222', borderRadius: 10, marginBottom: 24, marginRight: -3, marginLeft: 3 },
  compactNavigation: { transform: [{ translateX: -3 }, { translateY: -3 }], borderWidth: theme.borderWidths.primaryCard, borderColor: '#222222', borderRadius: 10, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  stages: { minHeight: 40, flexDirection: 'row', alignItems: 'stretch' },
  stageTouch: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  stageDivider: { position: 'absolute', left: 0, top: -2, bottom: -2, width: 1.5, backgroundColor: '#222222', zIndex: 1 },
  stageName: { width: '100%', color: theme.colors.text, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textAlign: 'center', textTransform: 'uppercase' },
  intermediateLabel: { width: '100%', height: 16, justifyContent: 'center' },
  labelMeasurement: { position: 'absolute', left: 0, top: 0, width: 1000, alignItems: 'flex-start', opacity: 0 },
  intrinsicLabel: { width: 'auto', textAlign: 'left' },
  activeStage: { backgroundColor: '#B7E8F8' },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, minHeight: 27 },
  stageHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BCE574' },
  collapsibleStageName: { fontSize: 12, lineHeight: 18, letterSpacing: 0.65, textTransform: 'uppercase' },
  collapsibleStages: { flexGrow: 1, justifyContent: 'space-between', gap: 4, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4 },
  collapsibleStageTouch: { padding: 4, justifyContent: 'center', minHeight: 32 },
  collapsibleStageTouchThai: { flex: 1, minWidth: 0, alignItems: 'stretch' },
  stagePill: { borderRadius: 4, backgroundColor: '#EEEEEE', paddingHorizontal: 5, paddingVertical: 2 },
  stagePillThai: { alignItems: 'center', paddingHorizontal: 8 },
  collapsibleActiveStage: { backgroundColor: '#2860F0' },
  collapsibleActiveStageText: { color: '#FFFFFF' },
  levelScroll: { borderBottomLeftRadius: 9, borderBottomRightRadius: 9, overflow: 'hidden' },
  levels: { flexGrow: 1 },
  level: { flex: 1, minWidth: 72, minHeight: 36, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderTopWidth: 1, borderColor: '#333333' },
  levelDivider: { borderLeftWidth: 1 },
  activeLevel: { backgroundColor: '#BFEDFC' },
  levelText: { fontSize: 13, lineHeight: 19 },
});
