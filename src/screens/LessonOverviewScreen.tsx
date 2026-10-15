import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import pailinHead from '@/assets/images/characters/pailin_head.webp';
import lockBlackImage from '@/assets/images/lock-black.png';
import speakingIcon from '@/assets/images/lesson-speaking-icon.png';
import speakingIconGray from '@/assets/images/lesson-speaking-icon-gray.png';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui/AppText';
import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';
import { BackAction } from '@/src/components/ui/BackAction';
import { LessonOverviewTabBar } from '@/src/components/navigation/PailinTabBar';
import { getLessonSectionLabel } from '@/src/copy/lesson-detail';
import { theme } from '@/src/theme/theme';
import type { UiLanguage } from '@/src/types/home';

export type OverviewRow = { id: string; type: string; index: number; complete: boolean };
type Props = {
  language: UiLanguage; lessonLabel: string; title: string; focus: string;
  rows: OverviewRow[]; activeIndex: number | null; complete: boolean; hasAccount: boolean;
  lessonStarted: boolean;
  activeType?: string | null;
  onToggleLanguage: () => void; isLanguageLoading?: boolean;
  hasMembership: boolean; onSection: (index: number) => void; onListen?: () => void;
  listenComplete: boolean; speakingComplete: boolean; onSpeaking?: () => void; onDiscussion: () => void; onUpgrade: () => void;
  onSetFinished: (completed: boolean) => Promise<void>;
  tabs: { key: string; onPress: () => void }[];
};
const groups = [
  { en: 'THE CONVERSATION', th: 'บทสนทนา', types: ['prepare', 'listen', 'comprehension', 'transcript', 'apply'] },
  { en: 'LEARN', th: 'เรียนรู้', types: ['understand', 'extra_tip', 'common_mistake', 'culture_note', 'phrases_verbs'] },
  { en: 'PRACTICE', th: 'ฝึกฝน', types: ['practice', 'speaking'] },
  { en: 'CONNECT', th: 'เชื่อมต่อ', types: ['discussion'] },
];
const icons: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  prepare: 'auto-awesome', listen: 'headphones', comprehension: 'help-outline', transcript: 'chat-bubble-outline',
  apply: 'edit', understand: 'lightbulb-outline', extra_tip: 'star-outline', common_mistake: 'warning-amber',
  phrases_verbs: 'format-quote', culture_note: 'public', practice: 'track-changes', speaking: 'mic-none',
  discussion: 'forum',
};
const PREPARE_START_HINT_STORAGE_KEY = '@pailin_abroad:prepare_start_hint_seen';

export function LessonOverviewScreen(p: Props) {
  const insets = useSafeAreaInsets();
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isMarkingFinished, setIsMarkingFinished] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const activeRowRef = useRef<View>(null);
  const viewportHeightRef = useRef(0);
  const didScrollToActiveRef = useRef(false);
  const prepareHintDismissedRef = useRef(false);
  const [showPrepareStartHint, setShowPrepareStartHint] = useState(false);
  const prepareHintPulse = useSharedValue(0);
  const scrollToActiveRow = useCallback(() => {
    if (didScrollToActiveRef.current || viewportHeightRef.current <= 0 || !contentRef.current || !activeRowRef.current) return;
    requestAnimationFrame(() => {
      if (didScrollToActiveRef.current || viewportHeightRef.current <= 0 || !contentRef.current || !activeRowRef.current) return;
      activeRowRef.current.measureLayout(contentRef.current, (_x, y, _width, height) => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - (viewportHeightRef.current - height) / 2),
          animated: false,
        });
        didScrollToActiveRef.current = true;
      });
    });
  }, []);
  useEffect(() => {
    didScrollToActiveRef.current = false;
    scrollToActiveRow();
  }, [p.activeIndex, p.activeType, scrollToActiveRow]);
  const th = p.language === 'th';
  const dismissPrepareStartHint = useCallback(() => {
    if (prepareHintDismissedRef.current) return;
    prepareHintDismissedRef.current = true;
    setShowPrepareStartHint(false);
    void AsyncStorage.setItem(PREPARE_START_HINT_STORAGE_KEY, 'true').catch(() => undefined);
  }, []);
  useEffect(() => {
    if (p.complete) {
      dismissPrepareStartHint();
      return;
    }

    let active = true;
    void AsyncStorage.getItem(PREPARE_START_HINT_STORAGE_KEY)
      .then((storedValue) => {
        if (!active || prepareHintDismissedRef.current) return;
        if (storedValue === 'true') {
          prepareHintDismissedRef.current = true;
        } else {
          setShowPrepareStartHint(true);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [dismissPrepareStartHint, p.complete]);
  useEffect(() => {
    const prepareRow = p.rows.find((row) => row.type === 'prepare');
    if (
      p.lessonStarted &&
      prepareRow &&
      !p.activeType &&
      p.activeIndex === prepareRow.index
    ) {
      dismissPrepareStartHint();
    }
  }, [dismissPrepareStartHint, p.activeIndex, p.activeType, p.lessonStarted, p.rows]);
  useEffect(() => {
    cancelAnimation(prepareHintPulse);
    prepareHintPulse.value = 0;
    if (!showPrepareStartHint) return;

    prepareHintPulse.value = withDelay(
      350,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360, reduceMotion: ReduceMotion.System }),
          withTiming(0, { duration: 360, reduceMotion: ReduceMotion.System }),
          withDelay(850, withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }))
        ),
        3,
        false
      )
    );
    return () => cancelAnimation(prepareHintPulse);
  }, [prepareHintPulse, showPrepareStartHint]);
  const prepareHintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: prepareHintPulse.value * -2 },
      { scale: 1 + prepareHintPulse.value * 0.012 },
    ],
  }));
  const closeFinishModal = useCallback(() => {
    if (isMarkingFinished) return;
    setShowFinishModal(false);
    setFinishError(null);
  }, [isMarkingFinished]);
  const handleSetFinished = useCallback(async (completed: boolean) => {
    setIsMarkingFinished(true);
    setFinishError(null);
    try {
      await p.onSetFinished(completed);
      if (completed) {
        setShowFinishModal(false);
      }
    } catch {
      setFinishError(th ? 'ยังบันทึกไม่ได้ โปรดลองอีกครั้ง' : 'Could not save this lesson. Please try again.');
    } finally {
      setIsMarkingFinished(false);
    }
  }, [p, th]);
  const rows = [...p.rows];
  if (p.onListen) rows.push({ id: 'listen', type: 'listen', index: -1, complete: p.listenComplete });
  if (p.onSpeaking) rows.push({ id: 'speaking', type: 'speaking', index: -2, complete: p.speakingComplete });
  rows.push({ id: 'discussion', type: 'discussion', index: -3, complete: false });
  const groupedRows = groups
    .map(group => ({ ...group, items: group.types.flatMap(type => rows.filter(row => row.type === type)) }))
    .filter(group => group.items.length > 0);
  const isRowDone = (candidate: OverviewRow | null) => Boolean(candidate?.complete);
  const isRowActive = (candidate: OverviewRow | null) => Boolean(
    candidate &&
    candidate.type !== 'speaking' &&
    candidate.type !== 'discussion' &&
    (p.activeType
      ? p.activeType === candidate.type
      : p.activeIndex !== null && candidate.index === p.activeIndex)
  );
  return <View style={[s.screen, { paddingTop: insets.top }]}>
    <ScrollView
      ref={scrollRef}
      onContentSizeChange={scrollToActiveRow}
      onLayout={(event) => {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        scrollToActiveRow();
      }}>
      <View ref={contentRef} style={[s.content, { paddingBottom: insets.bottom + 86 }]}>
      <View style={s.topBar}>
        <BackAction
          language={p.language}
          label={th ? 'คลังบทเรียน' : 'Lesson library'}
          onPress={p.tabs[2].onPress}
          style={s.back}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={th ? 'Translate lesson to English' : 'แปลบทเรียนเป็นภาษาไทย'}
          disabled={p.isLanguageLoading}
          onPress={p.onToggleLanguage}
          style={[s.translatePill, p.isLanguageLoading ? s.translatePillDisabled : null]}>
          <View style={s.translatePillLabel}>
            <AppText language="en" variant="caption" style={s.translatePillText}>{th ? 'EN' : 'TH'}</AppText>
          </View>
        </Pressable>
      </View>
      <View style={s.header}>
        <View style={s.avatarCircle}>
          <Image source={pailinHead} style={s.avatar} contentFit="contain" />
        </View>
        <AppText style={s.eyebrow}>{p.lessonLabel.toUpperCase()}</AppText>
        <AppText language={p.language} style={s.title}>{p.title}</AppText>
        <AppText language={p.language} style={s.focus}>{p.focus}</AppText>
        <View style={s.status}><MaterialIcons name={p.complete ? 'check-circle' : 'check'} size={14} color="#8BBD3F" />
          <AppText language={p.language} style={[s.statusText, !p.complete && p.hasAccount ? s.statusTextSaved : null]}>{p.complete ? (th ? 'เรียนจบแล้ว' : 'Lesson complete') : p.hasAccount ? (th ? 'บันทึกความคืบหน้าอัตโนมัติ' : 'Progress saved automatically') : (th ? 'เลือกส่วนที่ต้องการเรียน' : 'Choose a section to begin')}</AppText>
        </View>
      </View>
      {groupedRows.map((group, groupIndex) => {
        const { items } = group;
        const previousGroup = groupedRows[groupIndex - 1] ?? null;
        const nextGroup = groupedRows[groupIndex + 1] ?? null;
        const previousGroupRow = previousGroup?.items.at(-1) ?? null;
        const firstRow = items[0] ?? null;
        const groupConnectorDone = isRowDone(previousGroupRow) && isRowDone(firstRow);
        const groupConnectorActive = isRowDone(previousGroupRow) && isRowActive(firstRow) && !isRowDone(firstRow);
        return <View key={group.en} style={s.group}>
          <View style={s.groupHeader}>
            {previousGroupRow ? (
              <View
                style={[
                  s.connector,
                  s.groupConnector,
                  groupConnectorDone ? s.doneConnector : null,
                  groupConnectorActive ? s.activeConnector : null,
                ]}
              />
            ) : null}
            <View style={s.groupLabel}><AppText language={p.language} style={s.eyebrow}>{group[p.language]}</AppText></View>
          </View>
          {items.map((row, itemIndex) => {
            const speaking = row.type === 'speaking';
            const discussion = row.type === 'discussion';
            const locked = speaking && !p.hasMembership;
            const done = row.complete;
            const active = !speaking && !discussion && (p.activeType
              ? p.activeType === row.type
              : p.activeIndex !== null && row.index === p.activeIndex);
            const previousRow = items[itemIndex - 1] ?? previousGroupRow;
            const nextRow = items[itemIndex + 1] ?? nextGroup?.items[0] ?? null;
            const previousDone = isRowDone(previousRow);
            const nextDone = isRowDone(nextRow);
            const nextActive = isRowActive(nextRow);
            const topConnectorDone = previousDone && done;
            const topConnectorActive = previousDone && active && !done;
            const bottomConnectorDone = done && nextDone;
            const bottomConnectorActive = done && nextActive && !nextDone;
            const label = row.type === 'listen'
              ? (th ? 'ฟัง' : 'Listen')
              : speaking
                ? (th ? 'ฝึกพูด' : 'Speaking')
                : discussion
                  ? (th ? 'การพูดคุย' : 'Discussion')
                  : getLessonSectionLabel(p.language, row.type);
            const onPress = locked
              ? p.onUpgrade
              : speaking
                ? p.onSpeaking
                : discussion
                  ? p.onDiscussion
                  : row.type === 'listen'
                    ? p.onListen
                    : () => {
                        if (row.type === 'prepare') dismissPrepareStartHint();
                        p.onSection(row.index);
                      };
            const showStartHint = row.type === 'prepare' && showPrepareStartHint;
            return <View key={row.id} style={s.rowWrap}>
              {previousRow ? (
                <View
                  style={[
                    s.connector,
                    s.topConnector,
                    topConnectorDone ? s.doneConnector : null,
                    topConnectorActive ? s.activeConnector : null,
                  ]}
                />
              ) : null}
              {nextRow ? (
                <View
                  style={[
                    s.connector,
                    s.bottomConnector,
                    bottomConnectorDone ? s.doneConnector : null,
                    bottomConnectorActive ? s.activeConnector : null,
                  ]}
                />
              ) : null}
              <View style={[s.dot, active && !done && s.activeDot, done && s.doneDot]}>{done && <MaterialIcons name="check" size={12} color="#1E1E1E" />}</View>
              <Animated.View style={showStartHint ? prepareHintAnimatedStyle : null}>
                <Pressable ref={active ? activeRowRef : undefined} onLayout={active ? scrollToActiveRow : undefined}
                  accessibilityRole="button" accessibilityLabel={locked ? `${label}: ${th ? 'อัปเกรดเพื่อปลดล็อก' : 'upgrade to unlock'}` : showStartHint ? `${label}: ${th ? 'เริ่มตรงนี้' : 'Start here'}` : label} onPress={onPress}
                  accessibilityState={{ selected: active }}
                  accessibilityHint={!locked && done ? (th ? 'เรียนส่วนนี้เสร็จแล้ว' : 'Completed') : undefined}
                  style={[s.row, done && s.doneRow, active && s.activeRow, locked && s.lockedRow, active && s.shadow]}>
                  {speaking ? (
                    <Image source={locked ? speakingIconGray : speakingIcon} style={s.speakingIcon} contentFit="contain" />
                  ) : (
                    <MaterialIcons name={icons[row.type] || 'article'} size={19} color={locked ? '#999' : '#222'} />
                  )}
                  <AppText language={p.language} style={[s.rowText, locked && s.muted]}>{label}</AppText>
                  {showStartHint ? (
                    <AppText language={p.language} style={[s.startHint, th ? s.startHintThai : null]}>
                      {th ? 'เริ่มตรงนี้!' : 'START HERE!'}
                    </AppText>
                  ) : null}
                  {speaking && <AppText style={s.ai}>AI</AppText>}
                  {locked ? (
                    <Image source={lockBlackImage} style={s.lockIcon} contentFit="contain" />
                  ) : (
                    <MaterialIcons name="chevron-right" size={20} color="#222" />
                  )}
                </Pressable>
              </Animated.View>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.complete
          ? (th ? 'ทำเครื่องหมายว่ายังเรียนไม่จบ' : 'Mark lesson as not completed')
          : (th ? 'ทำเครื่องหมายว่าเรียนจบ' : 'Mark lesson as completed')}
        accessibilityState={{ checked: p.complete, disabled: isMarkingFinished }}
        disabled={isMarkingFinished}
        onPress={() => {
          setFinishError(null);
          if (p.complete) {
            void handleSetFinished(false);
            return;
          }
          setShowFinishModal(true);
        }}
        style={({ pressed }) => [s.finishControl, pressed ? s.finishControlPressed : null]}>
        <View style={[s.finishCheck, p.complete ? s.finishCheckComplete : null]}>
          <MaterialIcons name="check" size={15} color="#1E1E1E" />
        </View>
        <AppText language={p.language} style={s.finishControlText}>
          {p.complete
            ? (th ? 'เรียนจบแล้ว!' : 'Lesson complete!')
            : (th ? 'ทำเครื่องหมายว่าเรียนจบ' : 'Mark lesson as completed')}
        </AppText>
      </Pressable>
      </View>
    </ScrollView>
    <LessonOverviewTabBar actions={p.tabs.map(tab => tab.onPress)} />
    <Modal
      animationType="fade"
      onRequestClose={closeFinishModal}
      transparent
      visible={showFinishModal && !p.complete}>
      <View style={s.finishModalBackdrop}>
        <View style={s.finishModalCard}>
          <Pressable
            motionDisabled
            accessibilityRole="button"
            accessibilityLabel={th ? 'ปิด' : 'Close'}
            disabled={isMarkingFinished}
            onPress={closeFinishModal}
            hitSlop={8}
            style={s.finishModalClose}>
            <MaterialIcons name="close" size={28} color="#1E1E1E" />
          </Pressable>
          <AppText language={p.language} style={s.finishModalTitle}>
            {th ? 'ทำเครื่องหมายบทเรียนนี้ว่าเรียนจบ?' : 'Mark this lesson as completed?'}
          </AppText>
          <AppText language={p.language} style={s.finishModalBody}>
            {th ? 'คุณสามารถกลับมาทบทวนส่วนที่พลาดไปได้เสมอ' : 'You can always return to review any sections you missed.'}
          </AppText>
          {finishError ? <AppText language={p.language} style={s.finishModalError}>{finishError}</AppText> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isMarkingFinished}
            onPress={() => void handleSetFinished(true)}
            style={({ pressed }) => [
              s.finishModalButton,
              s.finishModalPrimary,
              pressed ? s.finishModalButtonPressed : null,
              isMarkingFinished ? s.finishModalButtonDisabled : null,
            ]}>
            {isMarkingFinished ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText language={p.language} style={s.finishModalPrimaryText}>
                {th ? 'ทำเครื่องหมายว่าเรียนจบ\u00A0\u00A0✓' : 'MARK AS COMPLETED\u00A0\u00A0✓'}
              </AppText>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isMarkingFinished}
            onPress={closeFinishModal}
            style={({ pressed }) => [s.finishModalButton, s.finishModalCancel, pressed ? s.finishModalButtonPressed : null]}>
            <AppText language={p.language} style={s.finishModalCancelText}>{th ? 'ยกเลิก' : 'CANCEL'}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' }, content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: { flex: 1 },
  translatePill: { minWidth: 48, height: 24, minHeight: 24, borderRadius: 12, borderWidth: 1, borderColor: '#D0D0D0', backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
  translatePillDisabled: { opacity: 0.7 },
  translatePillLabel: { minWidth: 22, minHeight: 14, alignItems: 'center', justifyContent: 'center' },
  translatePillText: { color: theme.colors.text, fontSize: 11, lineHeight: 14, fontFamily: theme.typography.fontFaces.en.medium, fontWeight: theme.typography.weights.medium, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  avatarCircle: { position: 'absolute', right: -8, bottom: -8, width: 48, height: 48, overflow: 'hidden', borderWidth: 1, borderColor: '#222', borderRadius: 24, backgroundColor: '#BDEDFC', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, transform: [{ scaleX: -1 }] },
  header: { padding: 16, paddingRight: 40, borderWidth: theme.borderWidths.primaryCard, borderColor: '#D5D5D5', borderRadius: 10, backgroundColor: '#FFF', gap: 4 },
  eyebrow: { fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: .8 }, title: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  focus: { fontSize: 13, lineHeight: 19, color: '#777' }, status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }, statusText: { fontSize: 10, lineHeight: 16, color: '#777' }, statusTextSaved: { fontStyle: 'italic' },
  group: { marginTop: 26, paddingLeft: 30 },
  groupHeader: { position: 'relative' },
  groupLabel: { alignSelf: 'flex-start', backgroundColor: '#FFFCE5', padding: 8, borderRadius: 4, borderWidth: theme.borderWidths.standard, marginBottom: 15 },
  rowWrap: { paddingBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, padding: 10, backgroundColor: '#FFF', borderWidth: theme.borderWidths.primaryCard, borderColor: '#D0D0D0', borderRadius: 4 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 21 }, dot: { position: 'absolute', left: -29, top: 14, width: 17, height: 17, borderWidth: 1, borderColor: '#CCC', borderRadius: 9, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  connector: { position: 'absolute', left: -21, borderLeftWidth: 1, borderColor: '#DDD', borderStyle: 'dashed' },
  topConnector: { top: 0, height: 23 },
  bottomConnector: { top: 22, bottom: 0 },
  groupConnector: { top: -26, bottom: 0 },
  activeConnector: { borderColor: '#245BFF', borderStyle: 'solid' },
  doneConnector: { borderColor: '#8BBD3F', borderStyle: 'solid' },
  activeDot: { backgroundColor: '#2860E8', borderColor: '#222' }, doneDot: { backgroundColor: '#B9E679', borderColor: '#222' },
  activeRow: { backgroundColor: '#BDEDFC', borderColor: '#222' }, doneRow: { backgroundColor: '#F3FFDA', borderColor: '#8BBD3F' },
  shadow: { boxShadow: '2px 3px 0px #222' },
  startHint: { color: '#245BFF', fontSize: 10, lineHeight: 15, fontWeight: '800', letterSpacing: 0.5 },
  startHintThai: { fontSize: 11, letterSpacing: 0 },
  lockedRow: { backgroundColor: '#F0F0F0' }, muted: { color: '#999' }, ai: { fontSize: 10, color: '#245BFF', backgroundColor: '#EBF2FF', paddingHorizontal: 4 },
  speakingIcon: { width: 20, height: 20 }, lockIcon: { width: 20, height: 20 },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, marginTop: 4, borderWidth: theme.borderWidths.primaryCard, borderColor: '#245BFF', backgroundColor: '#EBF3FF', borderRadius: 4 },
  upgradeTitle: { color: '#245BFF', fontSize: 9, lineHeight: 14, fontWeight: '700' }, upgradeBody: { fontSize: 10, lineHeight: 15 },
  finishControl: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 4, marginBottom: 22, paddingHorizontal: 12, paddingVertical: 10 },
  finishControlPressed: { opacity: 0.65 },
  finishCheck: { width: 20, height: 20, borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  finishCheckComplete: { backgroundColor: '#B9E679' },
  finishControlText: { fontSize: 14, lineHeight: 21, color: '#1E1E1E' },
  finishModalBackdrop: { flex: 1, backgroundColor: 'rgba(30, 30, 30, 0.46)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  finishModalCard: { width: '100%', maxWidth: 440, borderWidth: 1.5, borderColor: '#1E1E1E', borderRadius: 28, backgroundColor: '#FFF', paddingHorizontal: 40, paddingTop: 50, paddingBottom: 24, alignItems: 'center', boxShadow: '6px 7px 0px #1E1E1E' },
  finishModalClose: { position: 'absolute', top: 17, right: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  finishModalTitle: { color: '#1E1E1E', fontSize: 20, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  finishModalBody: { maxWidth: 320, marginTop: 10, marginBottom: 22, color: '#1E1E1E', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  finishModalError: { marginTop: -18, marginBottom: 12, color: theme.colors.error, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  finishModalButton: { width: '100%', minHeight: 44, borderWidth: 1.5, borderColor: '#1E1E1E', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  finishModalPrimary: { backgroundColor: '#2D67E8' },
  finishModalCancel: { marginTop: 12, backgroundColor: '#FFF' },
  finishModalPrimaryText: { color: '#FFF', fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  finishModalCancelText: { color: '#1E1E1E', fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  finishModalButtonPressed: { opacity: 0.82 },
  finishModalButtonDisabled: { opacity: 0.7 },
});
