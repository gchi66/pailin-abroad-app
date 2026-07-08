import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { AppText } from '@/src/components/ui/AppText';
import { ScriptLanguage, splitTextByScript } from '@/src/lib/script-aware-text';
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

const INLINE_MARKER_RE = /(\[\s*(?:X|x|✓|√|✔|check|-|✗|✕|✖|×)\ufe0e?\ufe0f?\s*\])/g;
const INLINE_MARKER_COLORS: Record<string, string> = {
  '[x]': '#FD6969',
  '[check]': '#3CA0FE',
  '[-]': '#28A265',
};
const INLINE_MARKER_DISPLAY: Record<string, string> = {
  '[x]': 'x',
  '[check]': '✓',
  '[-]': '-',
};
const getInlineMarkerKey = (marker: string) => {
  const compactMarker = marker.replace(/\s+/g, '').replace(/[\ufe0e\ufe0f]/g, '');
  const lowerMarker = compactMarker.toLowerCase();

  if (lowerMarker === '[x]' || compactMarker === '[✗]' || compactMarker === '[✕]' || compactMarker === '[✖]' || compactMarker === '[×]') {
    return '[x]';
  }
  if (lowerMarker === '[check]' || compactMarker === '[✓]' || compactMarker === '[√]' || compactMarker === '[✔]') {
    return '[check]';
  }
  if (compactMarker === '[-]') {
    return '[-]';
  }

  return null;
};
const getInlineMarkerColor = (marker: string) => {
  const markerKey = getInlineMarkerKey(marker);
  return markerKey ? INLINE_MARKER_COLORS[markerKey] : null;
};
const getInlineMarkerDisplay = (marker: string) => {
  const markerKey = getInlineMarkerKey(marker);
  return markerKey ? INLINE_MARKER_DISPLAY[markerKey] : null;
};
const TABLE_LINK_RE = /\[link:([^\]]+)\]([\s\S]*?)\[\/link\]/g;

const cleanAudioTags = (text: string) =>
  text
    .replace(/\[audio:[^\]]+\]/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n');

const getInlineText = (inline: LessonRichInline) => cleanAudioTags(String(inline?.text ?? ''));
const hasRenderableInlines = (inlines: LessonRichInline[] | null | undefined) =>
  Array.isArray(inlines) && inlines.some((inline) => getInlineText(inline).trim().length > 0);
const inlineFormattingKey = (inline: LessonRichInline) =>
  JSON.stringify({
    bold: inline.bold === true,
    italic: inline.italic === true,
    underline: inline.underline === true,
    link: typeof inline.link === 'string' ? inline.link.trim() : '',
    highlight: typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '',
  });
const mergeAdjacentTopicInlines = (inlines: LessonRichInline[] | null | undefined) => {
  if (!Array.isArray(inlines) || !inlines.length) {
    return [];
  }

  const merged: LessonRichInline[] = [];

  inlines.forEach((inline) => {
    const textValue = getInlineText(inline);
    if (!textValue) {
      return;
    }

    const previous = merged[merged.length - 1];
    const canMerge =
      previous &&
      inlineFormattingKey(previous) === inlineFormattingKey(inline) &&
      !String(previous.text ?? '').includes('\n') &&
      !textValue.includes('\n');

    if (canMerge) {
      merged[merged.length - 1] = {
        ...previous,
        text: `${String(previous.text ?? '')}${textValue}`,
      };
      return;
    }

    merged.push({
      ...inline,
      text: textValue,
    });
  });

  return merged;
};
const isListLikeNode = (node: LessonRichNode | null | undefined) =>
  node?.kind === 'numbered_item' || node?.kind === 'list_item' || node?.kind === 'misc_item';

const getHeadingText = (node: LessonRichNode | null) => {
  if (!node || !hasRenderableInlines(node.inlines)) {
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
  const [tableViewportWidths, setTableViewportWidths] = useState<Record<string, number>>({});
  const getInlineFontStyle = (language: ScriptLanguage, isBold: boolean) => {
    if (language === 'th') {
      return isBold ? styles.inlineBoldThai : styles.inlineTextThai;
    }

    return isBold ? styles.inlineBoldEnglish : styles.inlineTextEnglish;
  };

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
    const mergedInlines = mergeAdjacentTopicInlines(inlines);
    if (!mergedInlines.length) {
      return null;
    }

    return mergedInlines.map((inline, index) => {
      const textValue = getInlineText(inline);
      if (!textValue) {
        return null;
      }

      const parts = textValue.split(INLINE_MARKER_RE).filter(Boolean);
      const hasInlineMarker = parts.some((part) => getInlineMarkerColor(part));
      const renderSegments = (text: string, segmentKey: string, colorOverride?: string) =>
        splitTextByScript(text).map((segment, segmentIndex) => (
          <Text
            key={`${segmentKey}-${segmentIndex}`}
            style={[
              styles.inlineText,
              getInlineFontStyle(segment.language, inline.bold === true),
              colorOverride ? { color: colorOverride } : null,
            ]}>
            {segment.text}
          </Text>
        ));

      return (
        <Text
          key={`${keyPrefix}-${index}`}
          onPress={typeof inline.link === 'string' && inline.link.trim() ? () => handleOpenLink(String(inline.link)) : undefined}
          style={[
            styles.inlineText,
            inline.italic ? styles.inlineItalic : null,
            inline.underline ? styles.inlineUnderline : null,
            typeof inline.link === 'string' && inline.link.trim() ? styles.inlineLink : null,
          ]}>
          {hasInlineMarker
            ? parts.map((part, partIndex) => (
                <Text
                  key={`${keyPrefix}-${index}-${partIndex}`}
                  style={[
                    styles.inlineText,
                    inline.italic ? styles.inlineItalic : null,
                    inline.underline ? styles.inlineUnderline : null,
                    getInlineMarkerColor(part) ? styles.inlineMarker : null,
                    getInlineMarkerColor(part) ? { color: getInlineMarkerColor(part) } : null,
                  ]}>
                  {renderSegments(getInlineMarkerDisplay(part) ?? part, `${keyPrefix}-${index}-${partIndex}`, getInlineMarkerColor(part) ?? undefined)}
                </Text>
              ))
            : renderSegments(textValue, `${keyPrefix}-${index}`)}
        </Text>
      );
    });
  };

  const renderTable = (node: LessonRichNode, key: string) => {
    const rows = Array.isArray(node.cells) ? node.cells : [];
    if (!rows.length) {
      return null;
    }

    const normalizeCell = (cell: unknown) => {
      if (cell && typeof cell === 'object') {
        const record = cell as Record<string, unknown>;
        return {
          text: String(record.text ?? ''),
          colspan: typeof record.colspan === 'number' ? record.colspan : undefined,
          rowspan: typeof record.rowspan === 'number' ? record.rowspan : undefined,
        };
      }

      return {
        text: String(cell ?? ''),
        colspan: undefined,
        rowspan: undefined,
      };
    };

    const tableRows = rows.map((row) => {
      const cells = Array.isArray(row) ? row : [];
      let columnStart = 0;

      return cells.map((cell) => {
        const normalized = normalizeCell(cell);
        const colSpan = normalized.colspan && normalized.colspan > 1 ? normalized.colspan : 1;
        const positionedCell = {
          ...normalized,
          columnStart,
          colSpan,
        };
        columnStart += colSpan;
        return positionedCell;
      });
    });

    const maxColumnCount = tableRows.reduce((maxCount, row) => {
      const rowWidth = row.reduce((width, cell) => Math.max(width, cell.columnStart + cell.colSpan), 0);
      return Math.max(maxCount, rowWidth);
    }, 0);

    const columnsWithContent = Array.from({ length: maxColumnCount }, () => false);
    tableRows.forEach((row) => {
      row.forEach((cell) => {
        if (!cell.text.trim()) {
          return;
        }
        for (let columnIndex = cell.columnStart; columnIndex < cell.columnStart + cell.colSpan; columnIndex += 1) {
          columnsWithContent[columnIndex] = true;
        }
      });
    });

    let visibleColumnCount = maxColumnCount;
    while (visibleColumnCount > 0 && !columnsWithContent[visibleColumnCount - 1]) {
      visibleColumnCount -= 1;
    }
    const tableMinWidth = Math.max(visibleColumnCount, 1) * 124;
    const tableViewportWidth = tableViewportWidths[key] ?? 0;
    const tableRenderWidth = Math.max(tableMinWidth, tableViewportWidth);

    const renderTableMarkerText = (text: string, keyPrefix: string, textStyle: object | object[]) => {
      const parts = text.split(INLINE_MARKER_RE).filter(Boolean);
      if (!parts.some((part) => getInlineMarkerColor(part))) {
        return text;
      }

      return parts.map((part, partIndex) => {
        const markerColor = getInlineMarkerColor(part);
        if (!markerColor) {
          return part;
        }

        return (
          <Text key={`${keyPrefix}-marker-${partIndex}`} style={[textStyle, styles.inlineMarker, { color: markerColor }]}>
            {getInlineMarkerDisplay(part) ?? part}
          </Text>
        );
      });
    };

    const renderTableCellTextWithLinks = (text: string, keyPrefix: string) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let linkIndex = 0;

      TABLE_LINK_RE.lastIndex = 0;

      while ((match = TABLE_LINK_RE.exec(text)) !== null) {
        const [raw, hrefRaw, linkText] = match;
        const start = match.index;
        const end = start + raw.length;

        if (start > lastIndex) {
          const segmentText = text.slice(lastIndex, start);
          parts.push(
            <Text key={`${keyPrefix}-text-${linkIndex}`} style={styles.tableCellText}>
              {renderTableMarkerText(segmentText, `${keyPrefix}-text-${linkIndex}`, styles.tableCellText)}
            </Text>
          );
        }

        const href = String(hrefRaw ?? '').trim();
        parts.push(
          <Text key={`${keyPrefix}-link-${linkIndex}`} onPress={() => handleOpenLink(href)} style={[styles.tableCellText, styles.inlineLink]}>
            {renderTableMarkerText(linkText || href, `${keyPrefix}-link-${linkIndex}`, [styles.tableCellText, styles.inlineLink])}
          </Text>
        );

        lastIndex = end;
        linkIndex += 1;
      }

      if (lastIndex < text.length) {
        const segmentText = text.slice(lastIndex);
        parts.push(
          <Text key={`${keyPrefix}-tail`} style={styles.tableCellText}>
            {renderTableMarkerText(segmentText, `${keyPrefix}-tail`, styles.tableCellText)}
          </Text>
        );
      }

      return parts.length ? parts : <Text style={styles.tableCellText}>{renderTableMarkerText(text, `${keyPrefix}-plain`, styles.tableCellText)}</Text>;
    };

    const renderTableCellContent = (cellText: string, rowIndex: number, cellIndex: number, isHeaderRow: boolean) => {
      const lines = String(cellText ?? '').split('\n');

      return lines.map((line, lineIndex) => (
        <Text
          key={`${key}-cell-${rowIndex}-${cellIndex}-line-${lineIndex}`}
          style={[
            styles.tableCellText,
            isHeaderRow ? styles.tableHeaderText : null,
            lineIndex > 0 ? styles.tableCellLine : null,
          ]}>
          {renderTableCellTextWithLinks(line, `${key}-cell-${rowIndex}-${cellIndex}-line-${lineIndex}`)}
        </Text>
      ));
    };

    return (
      <ScrollView
        key={key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableScrollerContent}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (!nextWidth || tableViewportWidths[key] === nextWidth) {
            return;
          }
          setTableViewportWidths((previous) => ({ ...previous, [key]: nextWidth }));
        }}>
        <View style={[styles.tableWrap, { width: tableRenderWidth }]}>
          {tableRows.map((row, rowIndex) => {
            return (
              <View
                key={`${key}-row-${rowIndex}`}
                style={[styles.tableRow, rowIndex === 0 ? styles.tableHeaderRow : null, rowIndex % 2 === 1 ? styles.tableAltRow : null]}>
                {row.map((cell, cellIndex) => {
                  if (cell.columnStart >= visibleColumnCount) {
                    return null;
                  }

                  const adjustedColSpan = Math.min(cell.colSpan, visibleColumnCount - cell.columnStart);
                  if (adjustedColSpan <= 0) {
                    return null;
                  }

                  return (
                    <View
                      key={`${key}-cell-${rowIndex}-${cellIndex}`}
                      style={[styles.tableCell, { width: (tableRenderWidth * adjustedColSpan) / Math.max(visibleColumnCount, 1) }]}>
                      {renderTableCellContent(cell.text, rowIndex, cellIndex, rowIndex === 0)}
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
      if (!hasRenderableInlines(node.inlines)) {
        return null;
      }
      return (
        <AppText key={nodeKey} language={contentLang} variant="body" style={[styles.subheader, indentStyle]}>
          {renderInlines(node.inlines, nodeKey)}
        </AppText>
      );
    }

    if (node.kind === 'numbered_item') {
      if (!hasRenderableInlines(node.inlines)) {
        return null;
      }
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
      if (!hasRenderableInlines(node.inlines)) {
        return null;
      }
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
      if (!hasRenderableInlines(node.inlines)) {
        return null;
      }
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
    const numberedCountsByIndent = new Map<number, number>();
    let previousRenderedNode: LessonRichNode | null = null;

    const resetNumberedCounters = () => {
      numberedCountsByIndent.clear();
    };

    const getNumberedIndex = (node: LessonRichNode) => {
      const indentLevel = getIndentLevel(node);
      const nextIndex = numberedCountsByIndent.get(indentLevel) ?? 1;
      numberedCountsByIndent.set(indentLevel, nextIndex + 1);
      return nextIndex;
    };

    const getNodeSpacing = (
      previousNode: LessonRichNode | null,
      currentNode: LessonRichNode,
      currentNumberedIndex?: number
    ) => {
      if (!previousNode) {
        return 0;
      }

      if (currentNode.kind === 'numbered_item' && (currentNumberedIndex ?? 0) > 1) {
        return previousNode.kind === 'numbered_item' ? 0 : theme.spacing.sm;
      }

      if (isListLikeNode(previousNode) || isListLikeNode(currentNode)) {
        return 0;
      }

      return theme.spacing.sm;
    };

    return (
      <View
        key={`${keyPrefix}-group-${groupIndex}`}
        style={[
          styles.zebraGroup,
          groupIndex % 2 === 1 ? styles.zebraGroupAlt : null,
          groupIndex === 0 ? styles.zebraGroupFirst : null,
        ]}>
        {group.map((node, index) => {
          let renderedNode: React.ReactNode = null;
          let currentNumberedIndex: number | undefined;

          if (node.kind === 'numbered_item') {
            currentNumberedIndex = getNumberedIndex(node);
            renderedNode = renderNode(node, index, `${keyPrefix}-node`, currentNumberedIndex);
          } else {
            if ((node.kind === 'heading' && !node.is_subheader) || isSubheaderNode(node)) {
              resetNumberedCounters();
            }

            renderedNode = renderNode(node, index, `${keyPrefix}-node`);
          }

          if (!renderedNode) {
            return null;
          }

          const nodeSpacing = getNodeSpacing(previousRenderedNode, node, currentNumberedIndex);

          previousRenderedNode = node;

          return (
            <View key={`${keyPrefix}-wrap-${index}`} style={nodeSpacing > 0 ? { marginTop: nodeSpacing } : null}>
              {renderedNode}
            </View>
          );
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
      return hasRenderableInlines(node.inlines);
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
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  tableCellLine: {
    marginTop: 4,
  },
  tableHeaderText: {
    fontWeight: theme.typography.weights.semibold,
  },
});
