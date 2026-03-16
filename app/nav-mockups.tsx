import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type ConceptId = 'guest-primary' | 'member-primary' | 'account-sheet';
type PrimaryTab = 'Home' | 'Pathway';
type SecondaryTab = 'Lessons' | 'Resources' | 'Account';
type TabName = PrimaryTab | SecondaryTab;

type Concept = {
  id: ConceptId;
  title: { en: string; th: string };
  summary: { en: string; th: string };
  recommendation?: boolean;
};

const concepts: Concept[] = [
  {
    id: 'guest-primary',
    title: { en: 'Concept A: Guest Primary = Home', th: 'แบบ A: ผู้เยี่ยมชมใช้ Primary = Home' },
    summary: {
      en: 'For users without an account, the first tab behaves like Home and keeps the language toggle visible immediately.',
      th: 'สำหรับผู้ใช้ที่ยังไม่มีบัญชี แท็บแรกจะทำหน้าที่เป็น Home และวางปุ่มสลับภาษาไว้ให้เห็นทันที',
    },
    recommendation: true,
  },
  {
    id: 'member-primary',
    title: { en: 'Concept B: Member Primary = Pathway', th: 'แบบ B: สมาชิกใช้ Primary = Pathway' },
    summary: {
      en: 'Once a user has an account, the first tab becomes Pathway. Language moves into Account and the landing page disappears.',
      th: 'เมื่อผู้ใช้มีบัญชีแล้ว แท็บแรกจะกลายเป็น Pathway ปุ่มภาษาไปอยู่ใน Account และหน้า landing จะหายไป',
    },
    recommendation: true,
  },
  {
    id: 'account-sheet',
    title: { en: 'Concept C: Account as a Hub Sheet', th: 'แบบ C: ใช้ Account เป็น Hub แบบ Sheet' },
    summary: {
      en: 'A more app-like variant where Account behaves as a small hub and can foreground Membership, language, About, and Contact.',
      th: 'เป็นแนวทางที่ให้ความรู้สึกแบบแอปมากขึ้น โดยให้ Account ทำหน้าที่เป็น hub สำหรับ Membership ภาษา About และ Contact',
    },
  },
];

const memberTabs: readonly TabName[] = ['Pathway', 'Lessons', 'Resources', 'Account'];
const guestTabs: readonly TabName[] = ['Home', 'Lessons', 'Resources', 'Account'];

export default function NavMockupsScreen() {
  const { uiLanguage } = useUiLanguage();

  const title = uiLanguage === 'th' ? 'Primary Nav Mockups' : 'Primary Nav Mockups';
  const subtitle =
    uiLanguage === 'th'
      ? 'แบบร่างนี้เปลี่ยนแนวคิดจาก Home แบบถาวร เป็น Primary ที่สลับระหว่าง Home กับ Pathway ตามสถานะผู้ใช้'
      : 'These mockups shift the model from a permanent Home tab to a Primary tab that changes between Home and Pathway based on user state.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </Stack>
        </View>

        {concepts.map((concept) => (
          <Card key={concept.id} padding="lg" radius="lg" style={styles.conceptCard}>
            <Stack gap="md">
              <Stack gap="xs">
                <View style={styles.conceptHeadingRow}>
                  <AppText language={uiLanguage} variant="body" style={styles.conceptTitle}>
                    {uiLanguage === 'th' ? concept.title.th : concept.title.en}
                  </AppText>
                  {concept.recommendation ? (
                    <View style={styles.recommendationBadge}>
                      <AppText language={uiLanguage} variant="caption" style={styles.recommendationText}>
                        {uiLanguage === 'th' ? 'แนะนำ' : 'Recommended'}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText language={uiLanguage} variant="muted">
                  {uiLanguage === 'th' ? concept.summary.th : concept.summary.en}
                </AppText>
              </Stack>

              <View style={styles.phoneShell}>
                <View style={styles.phoneBackgroundAccent} />
                {concept.id === 'guest-primary' ? <GuestPrimaryPreview uiLanguage={uiLanguage} /> : null}
                {concept.id === 'member-primary' ? <MemberPrimaryPreview uiLanguage={uiLanguage} /> : null}
                {concept.id === 'account-sheet' ? <AccountSheetConceptPreview uiLanguage={uiLanguage} /> : null}
              </View>
            </Stack>
          </Card>
        ))}
      </Stack>
    </ScrollView>
  );
}

function GuestPrimaryPreview({ uiLanguage }: { uiLanguage: 'en' | 'th' }) {
  return (
    <>
      <View style={styles.previewContent}>
        <View style={styles.topBar}>
          <AppText language={uiLanguage} variant="caption" style={styles.topBarTitle}>
            {uiLanguage === 'th' ? 'Primary: Home' : 'Primary: Home'}
          </AppText>
          <View style={styles.languagePillSmall}>
            <AppText language={uiLanguage} variant="caption" style={styles.languagePillTextActive}>
              TH
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.languagePillDivider}>
              /
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.languagePillText}>
              EN
            </AppText>
          </View>
        </View>

        <View style={styles.stateBadgeRow}>
          <View style={styles.stateBadge}>
            <AppText language={uiLanguage} variant="caption" style={styles.stateBadgeText}>
              {uiLanguage === 'th' ? 'Guest State' : 'Guest State'}
            </AppText>
          </View>
        </View>

        <View style={styles.heroCard}>
          <AppText language={uiLanguage} variant="caption" style={styles.heroEyebrow}>
            {uiLanguage === 'th' ? 'Landing Experience' : 'Landing Experience'}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={styles.heroTitle}>
            {uiLanguage === 'th' ? 'ปุ่มภาษาอยู่บน Home สำหรับคนที่ยังไม่มีบัญชี' : 'Language is visible on Home for users without an account'}
          </AppText>
          <AppText language={uiLanguage} variant="muted">
            {uiLanguage === 'th'
              ? 'Membership ยังเข้าถึงง่ายผ่าน Account แต่ Home ยังคงทำหน้าที่เป็นหน้าแรกหลัก'
              : 'Membership is still easy to reach in Account, while Home remains the main landing surface.'}
          </AppText>
        </View>

        <View style={styles.feedCard}>
          <AppText language={uiLanguage} variant="caption" style={styles.feedCardLabel}>
            {uiLanguage === 'th' ? 'Guest Account Contains' : 'Guest Account Contains'}
          </AppText>
          <View style={styles.tokenRow}>
            <Token label={uiLanguage === 'th' ? 'Log in' : 'Log in'} />
            <Token label={uiLanguage === 'th' ? 'Sign up' : 'Sign up'} />
            <Token label="Membership" highlighted />
            <Token label="About" />
            <Token label="Contact" />
          </View>
        </View>
      </View>
      <BottomNavPreview activeTab="Home" tabs={guestTabs} uiLanguage={uiLanguage} />
    </>
  );
}

function MemberPrimaryPreview({ uiLanguage }: { uiLanguage: 'en' | 'th' }) {
  return (
    <>
      <View style={styles.previewContent}>
        <View style={styles.topBar}>
          <AppText language={uiLanguage} variant="caption" style={styles.topBarTitle}>
            {uiLanguage === 'th' ? 'Primary: Pathway' : 'Primary: Pathway'}
          </AppText>
        </View>

        <View style={styles.stateBadgeRow}>
          <View style={[styles.stateBadge, styles.stateBadgeBlue]}>
            <AppText language={uiLanguage} variant="caption" style={styles.stateBadgeText}>
              {uiLanguage === 'th' ? 'Logged-in State' : 'Logged-in State'}
            </AppText>
          </View>
        </View>

        <View style={styles.pathwayCard}>
          <AppText language={uiLanguage} variant="caption" style={styles.heroEyebrow}>
            {uiLanguage === 'th' ? 'My Pathway' : 'My Pathway'}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={styles.heroTitle}>
            {uiLanguage === 'th' ? 'เมื่อมีบัญชีแล้ว Home จะหายไปและ Pathway ขึ้นมาแทน' : 'Once an account exists, Home disappears and Pathway takes its place'}
          </AppText>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <AppText language={uiLanguage} variant="muted">
            {uiLanguage === 'th'
              ? 'ภาษาจะย้ายไปอยู่ใน Account เพื่อให้ Primary เน้นการเรียนรู้'
              : 'Language moves into Account so the first tab can focus on learning progress.'}
          </AppText>
        </View>

        <View style={styles.feedCard}>
          <AppText language={uiLanguage} variant="caption" style={styles.feedCardLabel}>
            {uiLanguage === 'th' ? 'Member Account Contains' : 'Member Account Contains'}
          </AppText>
          <View style={styles.tokenRow}>
            <Token label="Profile" />
            <Token label={uiLanguage === 'th' ? 'Language' : 'Language'} highlighted />
            <Token label="About" />
            <Token label="Contact" />
          </View>
        </View>
      </View>
      <BottomNavPreview activeTab="Pathway" tabs={memberTabs} uiLanguage={uiLanguage} />
    </>
  );
}

function AccountSheetConceptPreview({ uiLanguage }: { uiLanguage: 'en' | 'th' }) {
  return (
    <>
      <View style={styles.previewContent}>
        <View style={styles.topBar}>
          <AppText language={uiLanguage} variant="caption" style={styles.topBarTitle}>
            {uiLanguage === 'th' ? 'Account Hub' : 'Account Hub'}
          </AppText>
        </View>

        <View style={styles.dimmedScene}>
          <View style={styles.feedRow} />
          <View style={styles.feedRowShort} />
        </View>

        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="body" style={styles.sheetTitle}>
              {uiLanguage === 'th' ? 'Secondary Pages Live Here' : 'Secondary Pages Live Here'}
            </AppText>
            <View style={styles.sheetActionPrimary}>
              <AppText language={uiLanguage} variant="caption" style={styles.sheetActionPrimaryText}>
                {uiLanguage === 'th' ? 'Membership' : 'Membership'}
              </AppText>
            </View>
            <View style={styles.sheetActionRow}>
              <AppText language={uiLanguage} variant="caption" style={styles.sheetActionText}>
                {uiLanguage === 'th' ? 'ภาษา' : 'Language'}
              </AppText>
              <View style={styles.languagePillMini}>
                <AppText language={uiLanguage} variant="caption" style={styles.languagePillTextActive}>
                  TH
                </AppText>
                <AppText language={uiLanguage} variant="caption" style={styles.languagePillDivider}>
                  /
                </AppText>
                <AppText language={uiLanguage} variant="caption" style={styles.languagePillText}>
                  EN
                </AppText>
              </View>
            </View>
            <View style={styles.sheetActionRow}>
              <AppText language={uiLanguage} variant="caption" style={styles.sheetActionText}>
                {uiLanguage === 'th' ? 'เกี่ยวกับเรา' : 'About'}
              </AppText>
            </View>
            <View style={styles.sheetActionRow}>
              <AppText language={uiLanguage} variant="caption" style={styles.sheetActionText}>
                {uiLanguage === 'th' ? 'ติดต่อเรา' : 'Contact'}
              </AppText>
            </View>
          </Stack>
        </View>
      </View>
      <BottomNavPreview activeTab="Account" tabs={memberTabs} uiLanguage={uiLanguage} />
    </>
  );
}

function BottomNavPreview({
  activeTab,
  tabs,
  uiLanguage,
}: {
  activeTab: TabName;
  tabs: readonly TabName[];
  uiLanguage: 'en' | 'th';
}) {
  return (
    <View style={styles.bottomNavWrap}>
      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <View key={tab} style={styles.navItem}>
              <View style={[styles.navIcon, isActive ? styles.navIconActive : null]}>
                <AppText language={uiLanguage} variant="caption" style={isActive ? styles.navIconTextActive : styles.navIconText}>
                  {tabIconLabel(tab)}
                </AppText>
              </View>
              <AppText language={uiLanguage} variant="caption" style={isActive ? styles.navLabelActive : styles.navLabel}>
                {tabLabel(tab, uiLanguage)}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Token({ label, highlighted = false }: { label: string; highlighted?: boolean }) {
  return (
    <View style={[styles.token, highlighted ? styles.tokenHighlighted : null]}>
      <AppText variant="caption" style={highlighted ? styles.tokenTextHighlighted : styles.tokenText}>
        {label}
      </AppText>
    </View>
  );
}

function tabIconLabel(tab: TabName) {
  if (tab === 'Pathway') return 'P';
  if (tab === 'Home') return 'H';
  if (tab === 'Lessons') return 'L';
  if (tab === 'Resources') return 'R';
  return 'A';
}

function tabLabel(tab: TabName, uiLanguage: 'en' | 'th') {
  if (uiLanguage === 'th') {
    if (tab === 'Home') return 'หน้าแรก';
    if (tab === 'Pathway') return 'เส้นทาง';
    if (tab === 'Lessons') return 'บทเรียน';
    if (tab === 'Resources') return 'คลังเสริม';
    return 'บัญชี';
  }
  return tab;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  conceptCard: {
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  conceptHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  conceptTitle: {
    flex: 1,
    fontWeight: theme.typography.weights.semibold,
  },
  recommendationBadge: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF0B8',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  recommendationText: {
    fontWeight: theme.typography.weights.semibold,
  },
  phoneShell: {
    position: 'relative',
    minHeight: 560,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FCFCF8',
    overflow: 'hidden',
  },
  phoneBackgroundAccent: {
    position: 'absolute',
    top: -48,
    right: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#DDEEFF',
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 96,
    gap: theme.spacing.md,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  stateBadgeRow: {
    flexDirection: 'row',
  },
  stateBadge: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF0B8',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  stateBadgeBlue: {
    backgroundColor: '#DDEEFF',
  },
  stateBadgeText: {
    fontWeight: theme.typography.weights.semibold,
  },
  languagePillSmall: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  languagePillMini: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  languagePillTextActive: {
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  languagePillDivider: {
    color: theme.colors.mutedText,
  },
  languagePillText: {
    color: theme.colors.mutedText,
  },
  heroCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pathwayCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#CDEB8B',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  heroEyebrow: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  heroTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radii.xl,
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '62%',
    height: '100%',
    backgroundColor: '#1E1E1E',
  },
  feedCard: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  feedCardLabel: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.mutedText,
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  token: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tokenHighlighted: {
    backgroundColor: '#FFF0B8',
  },
  tokenText: {
    color: theme.colors.mutedText,
  },
  tokenTextHighlighted: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  feedRow: {
    height: 14,
    borderRadius: theme.radii.xl,
    backgroundColor: '#DDE4EA',
  },
  feedRowShort: {
    height: 14,
    width: '58%',
    borderRadius: theme.radii.xl,
    backgroundColor: '#E8EDF2',
  },
  dimmedScene: {
    flex: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xl,
    opacity: 0.45,
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D2D9DE',
  },
  sheetTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  sheetActionPrimary: {
    minHeight: 48,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionPrimaryText: {
    fontWeight: theme.typography.weights.semibold,
  },
  sheetActionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  sheetActionText: {
    fontWeight: theme.typography.weights.medium,
  },
  bottomNavWrap: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.md,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2F7',
  },
  navIconActive: {
    backgroundColor: '#91CAFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  navIconText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  navIconTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  navLabelActive: {
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
});
