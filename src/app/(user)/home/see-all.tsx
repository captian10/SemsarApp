// src/app/(user)/home/see-all.tsx
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PropertyCard from "@/components/PropertyCard";
import { FONT } from "@/constants/Typography";

import { useMyFavorites, useToggleFavorite } from "@/api/favorites";
import { usePropertyList, type PropertyRow } from "@/api/properties";
import { useAppTheme } from "@providers/AppThemeProvider";

type Sort = "latest" | "price_asc" | "price_desc";
type UIColors = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  error: string;
};

const normalize = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

function safeParam(v: unknown) {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

function safeSort(v: string): Sort {
  if (v === "price_asc" || v === "price_desc" || v === "latest") return v;
  return "latest";
}

function sortList(list: PropertyRow[], sort: Sort) {
  const arr = [...list];
  arr.sort((a: any, b: any) => {
    if (sort === "latest") {
      const da = new Date(a?.created_at ?? 0).getTime();
      const db = new Date(b?.created_at ?? 0).getTime();
      return db - da;
    }
    const pa = Number(a?.price ?? 0);
    const pb = Number(b?.price ?? 0);
    if (sort === "price_asc") return pa - pb;
    return pb - pa;
  });
  return arr;
}

export default function SeeAllScreen() {
  const params = useLocalSearchParams();

  const theme = useAppTheme();
  const isDark = theme.scheme === "dark";

  const ui = useMemo<UIColors>(
    () => ({
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      muted: theme.colors.muted,
      border: theme.colors.border,
      primary: theme.colors.primary,
      error: theme.colors.error,
    }),
    [theme]
  );

  const { styles, tokens } = useMemo(
    () => createStyles(ui, isDark),
    [ui, isDark]
  );

  const titleParam = safeParam((params as any)?.title) || "عرض الكل";
  const typeParam = safeParam((params as any)?.type).trim(); // e.g. "شقة"
  const sortParam = safeSort(safeParam((params as any)?.sort));
  const qParam = safeParam((params as any)?.q);

  // ✅ server-side filter by type if provided (لو hook عندك لا يدعمها، شيل الـ object وخليه usePropertyList())
  const { data, error, isLoading, refetch, isFetching } = usePropertyList({
    type: typeParam.length ? typeParam : undefined,
  } as any);

  // favorites
  const { data: favRows } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const favoriteIds = useMemo(() => {
    const ids = (favRows ?? []).map((r: any) => String(r.property_id));
    return new Set(ids);
  }, [favRows]);

  const [optimisticFav, setOptimisticFav] = useState<Record<string, boolean>>(
    {}
  );
  const isFav = useCallback(
    (id: string) => optimisticFav[id] ?? favoriteIds.has(id),
    [optimisticFav, favoriteIds]
  );

  const onToggleFavorite = useCallback(
    (propertyId: string) => {
      const id = String(propertyId);
      const current = optimisticFav[id] ?? favoriteIds.has(id);
      const next = !current;

      setOptimisticFav((prev) => ({ ...prev, [id]: next }));

      toggleFav.mutate(
        { propertyId: id, next },
        {
          onError: (err: any) => {
            setOptimisticFav((prev) => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
            });
            Alert.alert("خطأ", err?.message ?? "لم نستطع تحديث المفضلة");
          },
          onSettled: () => {
            setOptimisticFav((prev) => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
            });
          },
        }
      );
    },
    [toggleFav, favoriteIds, optimisticFav]
  );

  // local search
  const [query, setQuery] = useState(qParam);

  const baseList = useMemo(
    () => (data ?? []).filter(Boolean) as PropertyRow[],
    [data]
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    const searched = !q.length
      ? baseList
      : baseList.filter((p: any) => {
          const t = normalize(p?.title);
          const c = normalize(p?.city);
          const a = normalize(p?.address);
          return t.includes(q) || c.includes(q) || a.includes(q);
        });

    return sortList(searched, sortParam);
  }, [baseList, query, sortParam]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: titleParam,
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: ui.card },
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 16,
            color: ui.text,
          },
          headerTintColor: ui.text,
        }}
      />

      {/* Search */}
      <View style={styles.searchCard}>
        <View style={styles.searchWrap}>
          <FontAwesome name="search" size={14} color={tokens.ink45} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث…"
            placeholderTextColor={tokens.ink35}
            style={styles.searchInput}
          />
          {!!query && (
            <Pressable
              onPress={() => setQuery("")}
              style={({ pressed }) => [
                styles.clearBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={10}
            >
              <FontAwesome name="times" size={12} color={tokens.ink60} />
            </Pressable>
          )}
        </View>

        <Text style={styles.metaText} numberOfLines={1}>
          {typeParam ? typeParam : "الكل"} • {filtered.length} نتيجة
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={ui.primary} />
          <Text style={styles.stateText}>جاري التحميل…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.errTitle}>حصل خطأ</Text>
          <Text style={styles.stateText}>
            {(error as any)?.message ?? "فشل تحميل البيانات"}
          </Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String((item as any)?.id ?? idx)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={filtered.length ? styles.row : undefined}
          renderItem={({ item }) => {
            const id = String((item as any).id);
            return (
              <View style={styles.col}>
                <PropertyCard
                  hrefBase="/(user)/home"
                  property={item as any}
                  isFavorite={isFav(id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </View>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={!!isFetching}
              onRefresh={() => refetch()}
              tintColor={ui.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>مفيش نتائج</Text>
              <Text style={styles.emptyText}>جرّب بحث مختلف.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={<View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(colors: UIColors, isDark: boolean) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink03 = `rgba(${ink},0.03)`;
  const ink06 = `rgba(${ink},0.06)`;
  const ink08 = `rgba(${ink},0.08)`;
  const ink10 = `rgba(${ink},0.10)`;
  const ink35 = `rgba(${ink},0.35)`;
  const ink45 = `rgba(${ink},0.45)`;
  const ink60 = `rgba(${ink},0.60)`;

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    searchCard: {
      margin: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },

    searchWrap: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ink08,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : ink03,
    },

    searchInput: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: 13,
      color: colors.text,
      textAlign: "right",
      paddingVertical: 0,
    },

    clearBtn: {
      width: 30,
      height: 30,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ink06,
    },

    metaText: {
      marginTop: 10,
      fontFamily: FONT.medium,
      fontSize: 12,
      color: ink60,
      textAlign: "right",
    },

    listContent: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
    row: { justifyContent: "space-between" },
    col: { flex: 1, maxWidth: "50%", paddingHorizontal: 6 },

    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 16,
    },

    stateText: {
      fontFamily: FONT.regular,
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
    },

    errTitle: {
      fontFamily: FONT.bold,
      fontSize: 15,
      color: colors.error,
      textAlign: "center",
    },

    retryBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
    },

    retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

    empty: { alignItems: "center", paddingTop: 40, gap: 8 },
    emptyTitle: { fontFamily: FONT.bold, fontSize: 16, color: colors.text },
    emptyText: { fontFamily: FONT.regular, fontSize: 13, color: colors.muted },

    pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  });

  return { styles, tokens: { ink35, ink45, ink60 } };
}
