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

import { useMyFavorites, useToggleFavorite } from "@api/favorites";
import PropertyCard from "@components/PropertyCard";

function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnBase,
        variant === "ghost" ? styles.btnGhost : styles.btnPrimary,
        disabled && { opacity: 0.7 },
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text
        style={[
          styles.btnTextBase,
          variant === "ghost" ? styles.btnTextGhost : styles.btnTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const { data, isLoading, isFetching, error, refetch } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const list = useMemo(() => data ?? [], [data]);
  const count = list.length;

  const removingId = toggleFav.variables?.propertyId;

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
        <View style={styles.topRow}>
          <Text style={styles.title}>المفضلة</Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.error}>حصل خطأ في تحميل المفضلة</Text>
          <Button
            label={isFetching ? "جاري المحاولة…" : "إعادة المحاولة"}
            onPress={refetch}
            disabled={isFetching}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* simple header */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>عدد العناصر: {count}</Text>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item: any) => String(item.property_id)}
        renderItem={({ item }: any) => {
          const pid = String(item.property_id);

          return (
            <View
              style={
                toggleFav.isPending && removingId === pid
                  ? { opacity: 0.6 }
                  : undefined
              }
            >
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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={<View style={{ height: 18 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          count === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>مفيش مفضلة</Text>
            <Text style={styles.muted}>اضغط ♥ على أي عقار عشان يظهر هنا</Text>
            <Button label="تحديث" onPress={refetch} variant="ghost" />
          </View>
        }
      />
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

  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  title: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  subTitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  refreshChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "#fff",
  },

  refreshChipText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: THEME.dark[100],
  },

  listContent: {
    paddingBottom: 10,
  },

  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },

  emptyTitle: {
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

  error: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: THEME.error,
    textAlign: "center",
  },

  btnBase: {
    marginTop: 4,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnPrimary: {
    backgroundColor: THEME.primary,
  },
  btnGhost: {
    backgroundColor: THEME.primary,
  },

  btnTextBase: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  btnTextPrimary: {
    color: "#fff",
  },
  btnTextGhost: {
    color: "#fff",
  },

  btnPressed: {
    opacity: 0.9,
  },
});
