import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { AppText } from '@/src/components/ui/AppText';
import { supabase } from '@/src/lib/supabase';
import { theme } from '@/src/theme/theme';
import { LessonRichInline, LessonRichNode } from '@/src/types/lesson';

type TopicRichContentProps = {
  contentLang: 'en' | 'th';
  nodes: LessonRichNode[];
};

type TopicSection = {
  key: string;
  heading: LessonRichNode | null;
  body: LessonRichNode[];
};

const INLINE_MARKER_RE = /(\[X\]|\[✓\]|\[-\]|\[x\]|\[check\])/g;
const INLINE_MARKER_COLORS: Record<string, string> = {
  '[X]': '#FD6969',
  '[x]': '#FD6969',
  '[✓]': '#3CA0FE',
  '[check]': '#3CA0FE',
  '[-]': '#28A265',
};

const cleanAudioTags = (text: string) =>
  text
    .replace(/\[audio:[^\]]+\]/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n');

const getInlineText = (inline: LessonRichInline) => cleanAudioTags(String(inline?.text ?? ''));

const getHeadingText = (node: LessonRichNode | null) => {
  if (!node || !Array.isArray(node.inlines)) {
    return '';
  }

  return node.inlines
    .map((inline) => String(inline?.text ?? ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\t+/, '');
};

const isBoldParagraphNode = (node: LessonRichNode) =>
  node.kind === 'paragraph' &&
  Array.isArray(node.inlines) &&
  node.inlines.length > 0 &&
  node.inlines.every((inline) => !getInlineText(inline).trim() || inline.bold === true);

const isSubheaderNode = (node: LessonRichNode) => {
  if (node.kind === 'heading' && node.is_subheader) {
    return true;
  }

  return isBoldParagraphNode(node);
};

const getIndentLevel = (node: LessonRichNode) => {
  if (typeof node.indent_level === 'number') {
    return node.indent_level;
  }
  if (typeof node.indent === 'number') {
    return node.indent;
  }
  if (typeof node.indent_first_line_level === 'number') {
    return node.indent_first_line_level;
  }
  return 0;
};

const buildTopicImageUrl = (imageKey: string | null | undefined) => {
  const normalizedKey = typeof imageKey === 'string' ? imageKey.trim() : '';
  if (!normalizedKey) {
    return null;
  }

  const finalKey = normalizedKey.includes('.') ? normalizedKey : `${normalizedKey}.webp`;
  const { data } = supabase.storage.from('lesson-images').getPublicUrl(finalKey);
  return data?.publicUrl ?? null;
};

export function TopicRichContent({ contentLang, nodes }: TopicRichContentProps) {
  const router = useRouter();
  const inlineBaseStyle = contentLang === 'th' ? styles.inlineTextThai : styles.inlineTextEnglish;
  const inlineBoldStyle = contentLang === 'th' ? styles.inlineBoldThai : styles.inlineBoldEnglish;

  const sections = useMemo(() => {
    const nextSections: TopicSection[] = [];
    let current: TopicSection | null = null;

    nodes.forEach((node, index) => {
      if (node.kind === 'heading' && !node.is_subheader) {
        if (current) {
          nextSections.push(current);
        }
        current = {
          key: `heading-${index}`,
          heading: node,
          body: [],
        };
        return;
      }

      if (!current) {
        current = {
          key: `section-${index}`,
          heading: null,
          body: [],
        };
      }

      current.body.push(node);
    });

    if (current) {
      nextSections.push(current);
    }

    return nextSections;
  }, [nodes]);

  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedKeys((previous) => {
      const next: Record<string, boolean> = {};
      sections.forEach((section) => {
        next[section.key] = previous[section.key] ?? true;
      });
      return next;
    });
  }, [sections]);

  const handleOpenLink = (href: string) => {
    let nextHref = href.trim();
    if (!nextHref) {
      return;
    }

    if (nextHref.startsWith('https://pa.invalid/topic-library/')) {
      const slug = nextHref.replace('https://pa.invalid/topic-library/', '').replace(/^\/+/, '');
      if (slug) {
        router.push(`/(tabs)/resources/topic-library/${slug}`);
      }
      return;
    }

    if (nextHref.startsWith('https://pa.invalid/lesson/')) {
      const lessonId = nextHref.replace('https://pa.invalid/lesson/', '').replace(/^\/+/, '');
      if (lessonId) {
        router.push(`/lessons/${lessonId}`);
      }
      return;
    }

    if (nextHref.startsWith('/topic-library/')) {
      const slug = nextHref.replace('/topic-library/', '').replace(/^\/+/, '');
      if (slug) {
        router.push(`/(tabs)/resources/topic-library/${slug}`);
      }
      return;
    }

    if (nextHref.startsWith('/lesson/')) {
      const lessonId = nextHref.replace('/lesson/', '').replace(/^\/+/, '');
      if (lessonId) {
        router.push(`/lessons/${lessonId}`);
      }
      return;
    }

    void Linking.openURL(nextHref).catch(() => undefined);
  };

  const renderInlines = (inlines: LessonRichInline[] | null | undefined, keyPrefix: string) => {
    if (!Array.isArray(inlines) || !inlines.length) {
      return null;
    }

    return inlines.map((inline, index) => {
      const textValue = getInlineText(inline);
      if (!textValue) {
        return null;
      }

      const parts = textValue.split(INLINE_MARKER_RE).filter(Boolean);

      return (
        <Text
          key={`${keyPrefix}-${index}`}
          onPress={typeof inline.link === 'string' && inline.link.trim() ? () => handleOpenLink(String(inline.link)) : undefined}
          style={[
            styles.inlineText,
            inlineBaseStyle,
            inline.bold ? inlineBoldStyle : null,
            inline.italic ? styles.inlineItalic : null,
            inline.underline ? styles.inlineUnderline : null,
            typeof inline.link === 'string' && inline.link.trim() ? styles.inlineLink : null,
          ]}>
          {parts.length > 1
            ? parts.map((part, partIndex) => (
                <Text
                  key={`${keyPrefix}-${index}-${partIndex}`}
                  style={[
                    styles.inlineText,
                    inlineBaseStyle,
                    inline.bold ? inlineBoldStyle : null,
                    inline.italic ? styles.inlineItalic : null,
                    inline.underline ? styles.inlineUnderline : null,
                    INLINE_MARKER_COLORS[part] ? styles.inlineMarker : null,
                    INLINE_MARKER_COLORS[part] ? { color: INLINE_MARKER_COLORS[part] } : null,
                  ]}>
                  {part}
                </Text>
              ))
            : textValue}
        </Text>
      );
    });
  };

  const renderTable = (node: LessonRichNode, key: string) => {
    const rows = Array.isArray(node.cells) ? node.cells : [];
    if (!rows.length) {
      return null;
    }

    return (
      <ScrollView key={key} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScrollerContent}>
        <View style={styles.tableWrap}>
          {rows.map((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : [];
            return (
              <View
                key={`${key}-row-${rowIndex}`}
                style={[styles.tableRow, rowIndex === 0 ? styles.tableHeaderRow : null, rowIndex % 2 === 1 ? styles.tableAltRow : null]}>
                {cells.map((cell, cellIndex) => {
                  const cellText =
                    typeof cell === 'string'
                      ? cell
                      : cell && typeof cell === 'object' && 'text' in cell
                        ? String(cell.text ?? '')
                        : '';
                  const colSpan =
                    cell && typeof cell === 'object' && 'colspan' in cell && typeof cell.colspan === 'number' && cell.colspan > 1
                      ? cell.colspan
                      : 1;

                  return (
                    <View key={`${key}-cell-${rowIndex}-${cellIndex}`} style={[styles.tableCell, { width: 124 * colSpan }]}>
                      <AppText
                        language={contentLang}
                        variant="body"
                        style={[styles.tableCellText, rowIndex === 0 ? styles.tableHeaderText : null]}>
                        {cellText}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderNode = (node: LessonRichNode, index: number, keyPrefix: string, numberedIndex?: number) => {
    const nodeKey = `${keyPrefix}-${index}`;
    const indentLevel = getIndentLevel(node);
    const indentStyle = indentLevel > 0 ? { marginLeft: indentLevel * 20 } : null;

    if (node.kind === 'spacer') {
      return <View key={nodeKey} style={styles.spacer} />;
    }

    if (node.kind === 'image') {
      const src =
        (typeof node.image_url === 'string' && node.image_url.trim()) ||
        buildTopicImageUrl(typeof node.image_key === 'string' ? node.image_key : null);
      if (!src) {
        return null;
      }

      const altText =
        contentLang === 'th'
          ? String(node.alt_text_th ?? node.alt_text ?? 'Topic image')
          : String(node.alt_text ?? node.alt_text_th ?? 'Topic image');

      return (
        <View key={nodeKey} style={styles.imageWrap}>
          <Image source={{ uri: src }} contentFit="contain" style={styles.image} accessibilityLabel={altText} />
        </View>
      );
    }

    if (node.kind === 'table') {
      return renderTable(node, nodeKey);
    }

    if (node.kind === 'heading' && node.is_subheader) {
      return (
        <AppText key={nodeKey} language={contentLang} variant="body" style={[styles.subheader, indentStyle]}>
          {renderInlines(node.inlines, nodeKey)}
        </AppText>
      );
    }

    if (node.kind === 'numbered_item') {
      return (
        <View key={nodeKey} style={[styles.listRow, indentStyle]}>
          <View style={styles.numberBadge}>
            <AppText language="en" variant="caption" style={styles.numberBadgeText}>
              {numberedIndex ?? index + 1}.
            </AppText>
          </View>
          <AppText language={contentLang} variant="body" style={styles.listText}>
            {renderInlines(node.inlines, nodeKey)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'list_item' || node.kind === 'misc_item') {
      return (
        <View key={nodeKey} style={[styles.listRow, indentStyle]}>
          <View style={styles.bullet} />
          <AppText language={contentLang} variant="body" style={styles.listText}>
            {renderInlines(node.inlines, nodeKey)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'paragraph') {
      return (
        <AppText
          key={nodeKey}
          language={contentLang}
          variant="body"
          style={[styles.paragraph, indentStyle, isBoldParagraphNode(node) ? styles.subheader : null]}>
          {renderInlines(node.inlines, nodeKey)}
        </AppText>
      );
    }

    return null;
  };

  const groupBySubheader = (nodeList: LessonRichNode[]) => {
    const groups: LessonRichNode[][] = [];
    let current: LessonRichNode[] = [];

    nodeList.forEach((node) => {
      if (isSubheaderNode(node) && current.length) {
        groups.push(current);
        current = [];
      }
      current.push(node);
    });

    if (current.length) {
      groups.push(current);
    }

    return groups;
  };

  const renderGroup = (group: LessonRichNode[], groupIndex: number, keyPrefix: string) => {
    let numberedCounter = 0;

    return (
      <View
        key={`${keyPrefix}-group-${groupIndex}`}
        style={[
          styles.zebraGroup,
          groupIndex % 2 === 1 ? styles.zebraGroupAlt : null,
          groupIndex === 0 ? styles.zebraGroupFirst : null,
        ]}>
        {group.map((node, index) => {
          if (node.kind === 'numbered_item') {
            numberedCounter += 1;
            return renderNode(node, index, `${keyPrefix}-node`, numberedCounter);
          }

          if (isSubheaderNode(node)) {
            numberedCounter = 0;
          }

          return renderNode(node, index, `${keyPrefix}-node`);
        })}
      </View>
    );
  };

  const sectionHasRenderableContent = (section: TopicSection) =>
    Boolean(getHeadingText(section.heading)) ||
    section.body.some((node) => {
      if (node.kind === 'spacer') {
        return false;
      }
      if (node.kind === 'image' || node.kind === 'table') {
        return true;
      }
      return Array.isArray(node.inlines) && node.inlines.some((inline) => getInlineText(inline).trim().length > 0);
    });

  return (
    <View style={styles.sectionList}>
      {sections.filter(sectionHasRenderableContent).map((section, sectionIndex, filteredSections) => {
        const headingText = getHeadingText(section.heading);
        const groups = groupBySubheader(section.body);
        const isCollapsed = collapsedKeys[section.key] ?? true;

        return (
          <View
            key={section.key}
            style={[
              styles.sectionItem,
              sectionIndex === 0 ? styles.sectionItemFirst : null,
              sectionIndex === filteredSections.length - 1 ? styles.sectionItemLast : null,
            ]}>
            {headingText ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !isCollapsed }}
                style={styles.sectionHeaderButton}
                onPress={() =>
                  setCollapsedKeys((previous) => ({
                    ...previous,
                    [section.key]: !previous[section.key],
                  }))
                }>
                <AppText language={contentLang} variant="body" style={styles.sectionHeadingText}>
                  {headingText}
                </AppText>
                <Text style={[styles.sectionChevron, isCollapsed ? styles.sectionChevronCollapsed : styles.sectionChevronExpanded]}>▸</Text>
              </Pressable>
            ) : null}

            {!isCollapsed ? <View style={styles.sectionContent}>{groups.map((group, index) => renderGroup(group, index, section.key))}</View> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionList: {
    width: '100%',
    backgroundColor: theme.colors.surface,
  },
  sectionItem: {
    borderTopWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: theme.colors.surface,
  },
  sectionItemFirst: {
    borderTopWidth: 0,
  },
  sectionItemLast: {
    borderBottomWidth: 1,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 22,
    backgroundColor: theme.colors.surface,
  },
  sectionHeadingText: {
    flex: 1,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  sectionChevron: {
    fontSize: 18,
    color: theme.colors.text,
  },
  sectionChevronCollapsed: {
    transform: [{ rotate: '90deg' }],
  },
  sectionChevronExpanded: {
    transform: [{ rotate: '270deg' }],
  },
  sectionContent: {
    width: '100%',
  },
  zebraGroup: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  zebraGroupFirst: {
    paddingTop: theme.spacing.xs,
  },
  zebraGroupAlt: {
    backgroundColor: theme.colors.background,
  },
  inlineText: {
    color: theme.colors.text,
  },
  inlineTextEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  inlineTextThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  inlineBoldEnglish: {
    fontFamily: theme.typography.fontFaces.en.bold,
  },
  inlineBoldThai: {
    fontFamily: theme.typography.fontFaces.th.bold,
  },
  inlineItalic: {
    fontStyle: 'italic',
  },
  inlineUnderline: {
    textDecorationLine: 'underline',
  },
  inlineLink: {
    color: '#676769',
    textDecorationLine: 'underline',
  },
  inlineMarker: {
    fontWeight: theme.typography.weights.semibold,
  },
  paragraph: {
    color: theme.colors.text,
  },
  subheader: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: 30,
    fontWeight: theme.typography.weights.semibold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    marginTop: 8,
  },
  listText: {
    flex: 1,
  },
  numberBadge: {
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  numberBadgeText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  spacer: {
    height: theme.spacing.sm,
  },
  imageWrap: {
    width: '100%',
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: '#F4F7FB',
    marginVertical: theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: 220,
  },
  tableScrollerContent: {
    paddingVertical: theme.spacing.xs,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 360,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
  },
  tableHeaderRow: {
    backgroundColor: theme.colors.accentMuted,
  },
  tableAltRow: {
    backgroundColor: '#F8FCFF',
  },
  tableCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
  },
  tableCellText: {
    color: theme.colors.text,
  },
  tableHeaderText: {
    fontWeight: theme.typography.weights.semibold,
  },
});
