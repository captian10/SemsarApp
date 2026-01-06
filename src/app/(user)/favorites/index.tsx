import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

import PropertyCard from "@components/PropertyCard";
import { useMyFavorites, useToggleFavorite } from "@api/favorites";

export default function FavoritesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const list = useMemo(() => data ?? [], [data]);
  const count = list.length;

  const removingId = toggleFav.variables?.propertyId; // آخر عنصر بيتعمله toggle

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.muted}>جاري تحميل المفضلة…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Header count={count} />
        <View style={styles.center}>
          <Text style={styles.title}>حصل خطأ</Text>
          <Text style={styles.muted}>فشل تحميل المفضلة.</Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              isFetching && { opacity: 0.7 },
            ]}
            disabled={isFetching}
          >
            <Text style={styles.primaryBtnText}>
              {isFetching ? "جاري المحاولة…" : "إعادة المحاولة"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header count={count} />

      <FlatList
        data={list}
        keyExtractor={(item: any) => String(item.property_id)}
        renderItem={({ item }: any) => {
          const pid = String(item.property_id);

          return (
            <View style={toggleFav.isPending && removingId === pid ? { opacity: 0.6 } : undefined}>
              <PropertyCard
                hrefBase="/(user)/home"
                property={item.property}
                isFavorite={true}
                onToggleFavorite={(propertyId) => {
                  // ✅ في صفحة المفضلة: القلب = إزالة فقط
                  toggleFav.mutate({ propertyId, next: false });
                }}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          count === 0 && { flexGrow: 1, justifyContent: "center" },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={<View style={{ height: 18 }} />}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={() => refetch()}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.title}>لا توجد مفضلة</Text>
            <Text style={styles.muted}>اضغط ♥ على أي عقار عشان يظهر هنا</Text>

            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>تحديث</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

function Header({ count }: { count: number }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>المفضلة</Text>
      </View>
      <Text style={styles.headerSub}>{count} عنصر</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  header: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  headerSub: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
  },

  content: { paddingBottom: 10 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "center",
  },
  muted: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },

  primaryBtn: {
    marginTop: 6,
    width: "100%",
    maxWidth: 260,
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  ghostBtn: {
    marginTop: 6,
    width: "100%",
    maxWidth: 260,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  ghostBtnText: { color: THEME.primary, fontFamily: FONT.bold, fontSize: 13 },

  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});
