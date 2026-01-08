// src/app/(user)/home/see-all.tsx
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useLocalSearchParams } from "expo-router";

import { FONT } from "@/constants/Typography";
import { THEME } from "@/constants/Colors";
import PropertyCard from "@/components/PropertyCard";

import { usePropertyList, type PropertyRow } from "@/api/properties";
import { useMyFavorites, useToggleFavorite } from "@/api/favorites";

type Sort = "latest" | "price_asc" | "price_desc";

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

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

  const titleParam = String((params as any)?.title ?? "عرض الكل");
  const typeParam = String((params as any)?.type ?? "").trim(); // e.g. "شقة"
  const sortParam = (String((params as any)?.sort ?? "latest") as Sort) || "latest";
  const qParam = String((params as any)?.q ?? "");

  // ✅ server-side filter by type if provided
  const { data, error, isLoading, refetch, isFetching } = usePropertyList({
    type: typeParam.length ? typeParam : undefined,
  });

  // favorites
  const { data: favRows } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const favoriteIds = useMemo(() => {
    const ids = (favRows ?? []).map((r: any) => String(r.property_id));
    return new Set(ids);
  }, [favRows]);

  const [optimisticFav, setOptimisticFav] = useState<Record<string, boolean>>({});
  const isFav = useCallback((id: string) => optimisticFav[id] ?? favoriteIds.has(id), [optimisticFav, favoriteIds]);

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

  const baseList = useMemo(() => ((data ?? []).filter(Boolean) as PropertyRow[]), [data]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const searched =
      !q.length
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
          headerStyle: { backgroundColor: THEME.white.DEFAULT },
          headerTitleStyle: { fontFamily: FONT.bold, fontSize: 16, color: THEME.dark[100] },
        }}
      />

      {/* search */}
      <View style={styles.searchCard}>
        <View style={styles.searchWrap}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.45)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث…"
            placeholderTextColor="rgba(15,23,42,0.35)"
            style={styles.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]} hitSlop={10}>
              <FontAwesome name="times" size={12} color="rgba(15,23,42,0.55)" />
            </Pressable>
          )}
        </View>

        <Text style={styles.metaText} numberOfLines={1}>
          {typeParam ? typeParam : "الكل"} • {filtered.length} نتيجة
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={THEME.primary} />
          <Text style={styles.stateText}>جاري التحميل…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.errTitle}>حصل خطأ</Text>
          <Text style={styles.stateText}>{(error as any)?.message ?? "فشل تحميل البيانات"}</Text>

          <Pressable onPress={() => refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String((item as any)?.id ?? idx)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
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
            <RefreshControl refreshing={!!isFetching} onRefresh={() => refetch()} tintColor={THEME.primary} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },

  searchCard: {
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
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
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(15,23,42,0.03)",
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 13,
    color: THEME.dark[100],
    textAlign: "right",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.06)",
  },
  metaText: {
    marginTop: 10,
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "rgba(15,23,42,0.60)",
    textAlign: "right",
  },

  listContent: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
  col: { flex: 1, maxWidth: "50%", paddingHorizontal: 6 },

  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  stateText: { fontFamily: FONT.regular, fontSize: 13, color: THEME.gray[100], textAlign: "center" },
  errTitle: { fontFamily: FONT.bold, fontSize: 15, color: THEME.error, textAlign: "center" },

  retryBtn: {
    marginTop: 8,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  empty: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: FONT.bold, fontSize: 16, color: THEME.dark[100] },
  emptyText: { fontFamily: FONT.regular, fontSize: 13, color: THEME.gray[100] },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
