import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Image } from 'expo-image';
import pailinAvatar from '@/assets/images/pailin_blue_circle_right.webp';
import lockBlackImage from '@/assets/images/lock-black.png';
import speakingIcon from '@/assets/images/lesson-speaking-icon.png';
import speakingIconGray from '@/assets/images/lesson-speaking-icon-gray.png';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui/AppText';
import { LessonOverviewTabBar } from '@/src/components/navigation/PailinTabBar';
import { getLessonSectionLabel } from '@/src/copy/lesson-detail';
import type { UiLanguage } from '@/src/types/home';

export type OverviewRow = { id: string; type: string; index: number; complete: boolean };
type Props = {
  language: UiLanguage; lessonLabel: string; title: string; focus: string;
  rows: OverviewRow[]; activeIndex: number | null; complete: boolean; hasAccount: boolean;
  activeType?: string | null;
  hasMembership: boolean; onSection: (index: number) => void; onListen?: () => void;
  listenComplete: boolean; onSpeaking?: () => void; onUpgrade: () => void;
  tabs: { key: string; onPress: () => void }[];
};
const groups = [
  { en: 'THE CONVERSATION', th: 'บทสนทนา', types: ['prepare', 'listen', 'comprehension', 'transcript', 'apply'] },
  { en: 'LEARN', th: 'เรียนรู้', types: ['understand', 'extra_tip', 'common_mistake', 'phrases_verbs', 'culture_note'] },
  { en: 'PRACTICE', th: 'ฝึกฝน', types: ['practice', 'speaking'] },
];
const icons: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  prepare: 'auto-awesome', listen: 'headphones', comprehension: 'help-outline', transcript: 'chat-bubble-outline',
  apply: 'edit', understand: 'lightbulb-outline', extra_tip: 'lightbulb-outline', common_mistake: 'warning-amber',
  phrases_verbs: 'format-quote', culture_note: 'public', practice: 'track-changes', speaking: 'mic-none',
};
export function LessonOverviewScreen(p: Props) {
  const insets = useSafeAreaInsets();
  const th = p.language === 'th';
  const rows = [...p.rows];
  if (p.onListen) rows.push({ id: 'listen', type: 'listen', index: -1, complete: p.listenComplete });
  if (p.onSpeaking) rows.push({ id: 'speaking', type: 'speaking', index: -2, complete: false });
  return <View style={[s.screen, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}>
      <Pressable accessibilityRole="button" onPress={p.tabs[2].onPress} style={s.back}>
        <MaterialIcons name="arrow-back" size={20} /><AppText language={p.language} style={s.backText}>{th ? 'คลังบทเรียน' : 'Lesson library'}</AppText>
      </Pressable>
      <View style={s.header}>
        <Image source={pailinAvatar} style={s.avatar} contentFit="contain" />
        <AppText style={s.eyebrow}>{p.lessonLabel.toUpperCase()}</AppText>
        <AppText language={p.language} style={s.title}>{p.title}</AppText>
        <AppText language={p.language} style={s.focus}>{p.focus}</AppText>
        <View style={s.status}><MaterialIcons name={p.complete ? 'check-circle' : 'check'} size={14} color="#8BBD3F" />
          <AppText language={p.language} style={s.statusText}>{p.complete ? (th ? 'เรียนจบแล้ว' : 'Lesson complete') : p.hasAccount ? (th ? 'บันทึกความคืบหน้าอัตโนมัติ' : 'Progress saved automatically') : (th ? 'เลือกส่วนที่ต้องการเรียน' : 'Choose a section to begin')}</AppText>
        </View>
      </View>
      {groups.map(group => {
        const items = group.types.flatMap(type => rows.filter(row => row.type === type));
        if (!items.length) return null;
        return <View key={group.en} style={s.group}>
          <View style={s.groupLabel}><AppText language={p.language} style={s.eyebrow}>{group[p.language]}</AppText></View>
          {items.map(row => {
            const speaking = row.type === 'speaking';
            const locked = speaking && !p.hasMembership;
            const done = row.complete || (p.complete && !speaking);
            const active = !speaking && (p.activeType
              ? p.activeType === row.type
              : p.activeIndex !== null && row.index === p.activeIndex);
            const label = row.type === 'listen' ? (th ? 'ฟัง' : 'Listen') : speaking ? (th ? 'ฝึกพูด' : 'Speaking') : getLessonSectionLabel(p.language, row.type);
            const onPress = locked ? p.onUpgrade : speaking ? p.onSpeaking : row.type === 'listen' ? p.onListen : () => p.onSection(row.index);
            return <View key={row.id} style={s.rowWrap}>
              <View style={[s.line, done && s.doneLine, active && !done && s.activeLine]} />
              <View style={[s.dot, active && !done && s.activeDot, done && s.doneDot]}>{done && <MaterialIcons name="check" size={12} color="#1E1E1E" />}</View>
              <Pressable accessibilityRole="button" accessibilityLabel={locked ? `${label}: ${th ? 'อัปเกรดเพื่อปลดล็อก' : 'upgrade to unlock'}` : label} onPress={onPress}
                accessibilityState={{ selected: active }}
                accessibilityHint={!locked && done ? (th ? 'เรียนส่วนนี้เสร็จแล้ว' : 'Completed') : undefined}
                style={[s.row, done && s.doneRow, active && s.activeRow, locked && s.lockedRow, active && s.shadow]}>
                {speaking ? (
                  <Image source={locked ? speakingIconGray : speakingIcon} style={s.speakingIcon} contentFit="contain" />
                ) : (
                  <MaterialIcons name={icons[row.type] || 'article'} size={19} color={locked ? '#999' : '#222'} />
                )}
                <AppText language={p.language} style={[s.rowText, locked && s.muted]}>{label}</AppText>
                {speaking && <AppText style={s.ai}>AI</AppText>}
                {locked ? (
                  <Image source={lockBlackImage} style={s.lockIcon} contentFit="contain" />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color="#222" />
                )}
              </Pressable>
              {locked && <Pressable accessibilityRole="button" onPress={p.onUpgrade} style={s.upgrade}>
                <MaterialIcons name="auto-awesome" color="#245BFF" size={20} />
                <View style={{ flex: 1 }}><AppText language={p.language} style={s.upgradeTitle}>{th ? 'อัปเกรดเพื่อปลดล็อกการฝึกพูด' : 'UPGRADE TO UNLOCK SPEAKING'}</AppText>
                <AppText language={p.language} style={s.upgradeBody}>{th ? 'ฝึกพูดกับไพลินและรับคำแนะนำจาก AI' : 'Practice speaking with Pailin and get AI feedback'}</AppText></View>
                <MaterialIcons name="chevron-right" size={18} />
              </Pressable>}
            </View>;
          })}
        </View>;
      })}
    </ScrollView>
    <LessonOverviewTabBar actions={p.tabs.map(tab => tab.onPress)} />
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' }, content: { paddingHorizontal: 24 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }, backText: { fontSize: 13 },
  avatar: { position: 'absolute', right: -8, bottom: -8, width: 48, height: 48 },
  header: { padding: 16, paddingRight: 40, borderWidth: 1, borderColor: '#D5D5D5', borderRadius: 10, backgroundColor: '#FFF', gap: 4 },
  eyebrow: { fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: .8 }, title: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  focus: { fontSize: 13, lineHeight: 19, color: '#777' }, status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }, statusText: { fontSize: 10, lineHeight: 16, color: '#777' },
  group: { marginTop: 26, paddingLeft: 30 }, groupLabel: { alignSelf: 'flex-start', backgroundColor: '#FFFCE5', padding: 8, borderRadius: 4, borderWidth: 1, marginBottom: 15 },
  rowWrap: { paddingBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, padding: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 4 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 21 }, dot: { position: 'absolute', left: -29, top: 14, width: 17, height: 17, borderWidth: 1, borderColor: '#CCC', borderRadius: 9, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, left: -21, borderLeftWidth: 1, borderColor: '#DDD', borderStyle: 'dashed' },
  activeLine: { borderColor: '#245BFF', borderStyle: 'solid' }, doneLine: { borderColor: '#8BBD3F', borderStyle: 'solid' },
  activeDot: { backgroundColor: '#2860E8', borderColor: '#222' }, doneDot: { backgroundColor: '#B9E679', borderColor: '#222' },
  activeRow: { backgroundColor: '#BDEDFC', borderColor: '#222' }, doneRow: { backgroundColor: '#F3FFDA', borderColor: '#8BBD3F' },
  shadow: { shadowColor: '#222', shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  lockedRow: { backgroundColor: '#F0F0F0' }, muted: { color: '#999' }, ai: { fontSize: 10, color: '#245BFF', backgroundColor: '#EBF2FF', paddingHorizontal: 4 },
  speakingIcon: { width: 20, height: 20 }, lockIcon: { width: 20, height: 20 },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, marginTop: 4, borderWidth: 1, borderColor: '#245BFF', backgroundColor: '#EBF3FF', borderRadius: 4 },
  upgradeTitle: { color: '#245BFF', fontSize: 9, lineHeight: 14, fontWeight: '700' }, upgradeBody: { fontSize: 10, lineHeight: 15 },
});
