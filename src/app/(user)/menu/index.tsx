import React, { useMemo, useState } from "react";
import { useProductList } from "@api/products";
import ProductListItem from "@components/ProductListItem";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

const CATEGORIES = [
  "الكل",
  "بيتزا",
  "كريب",
  "سندوتشات",
  "وجبات",
  "مكرونة",
  "وجبات أخرى",
] as const;

type Category = (typeof CATEGORIES)[number];

export default function MenuScreen() {
  const { data: products, error, isLoading } = useProductList();

  const [activeCategory, setActiveCategory] = useState<Category>("الكل");

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (activeCategory === "الكل") return list;

    return list.filter((p: any) => String(p.category ?? "") === activeCategory);
  }, [products, activeCategory]);

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.stateText}>جاري تحميل القائمة...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>Failed to fetch products</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ✅ Category chips */}
      <View style={styles.topBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = activeCategory === c;

            return (
              <Pressable
                key={c}
                onPress={() => setActiveCategory(c)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ✅ Products grid */}
      <FlatList
        key={"two-cols"}
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        numColumns={2}
        renderItem={({ item }: any) => (
          <View style={styles.col}>
            <ProductListItem product={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>لا توجد منتجات في هذا القسم.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },

  // ✅ Top chips bar
  topBar: {
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: THEME.white.DEFAULT,
  },

  chipsRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: THEME.white.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },

  chipText: {
    fontSize: 13,
    color: THEME.primary,
    fontFamily: FONT.medium,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  chipTextActive: {
    color: THEME.white.DEFAULT,
    fontFamily: FONT.bold,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // ✅ Grid
  content: { padding: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
  col: {
    flex: 1,
    maxWidth: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  // ✅ Empty
  emptyWrap: { padding: 20, alignItems: "center" },
  emptyText: { color: THEME.gray[100], fontFamily: FONT.medium },

  // ✅ Loading/Error state
  stateWrap: {
    flex: 1,
    backgroundColor: THEME.white[100],
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  stateText: { color: THEME.gray[100], fontFamily: FONT.regular },
  errorTitle: { color: THEME.error, fontFamily: FONT.bold, fontSize: 16 },
});
