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
import { useMyFavorites, useToggleFavorite } from "@api/favorites";
import PropertyCard from "@components/PropertyCard";
import { useAppTheme } from "@providers/AppThemeProvider";

export default function FavoritesScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { data, isLoading, isFetching, error, refetch } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const list = useMemo(() => data ?? [], [data]);
  const count = list.length;

  const removingId = toggleFav.variables?.propertyId;

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
    const ink = isDark ? "255,255,255" : "15,23,42";
    const ink10 = `rgba(${ink},0.10)`;
    const ghostBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.03)";

    const isGhost = variant === "ghost";

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btnBase,
          isGhost
            ? { backgroundColor: ghostBg, borderWidth: 1, borderColor: ink10 }
            : { backgroundColor: colors.primary },
          disabled && { opacity: 0.65 },
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.btnTextBase,
            isGhost ? { color: colors.text } : { color: "#fff" },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.subTitle}>تعذر تحميل البيانات</Text>
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
      {/* header */}
      <View style={styles.topRow}>
        <Text style={styles.title}>المفضلة</Text>
        <Text style={styles.subTitle}>عدد العناصر: {count}</Text>
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
                isFavorite
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
            tintColor={colors.primary}
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

function createStyles(
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    error: string;
    tabBarBg: string;
    tabBarBorder: string;
  },
  isDark: boolean
) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink60 = `rgba(${ink},0.60)`;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 12,
      paddingTop: 12,
    },

    topRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 12,
    },

    title: {
      fontSize: 18,
      fontFamily: FONT.bold,
      color: colors.text,
      textAlign: "right",
    },

    subTitle: {
      fontSize: 12.5,
      fontFamily: FONT.medium,
      color: ink60,
      textAlign: "left",
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
      color: colors.text,
      textAlign: "center",
    },

    muted: {
      fontSize: 13,
      fontFamily: FONT.regular,
      color: ink60,
      textAlign: "center",
      lineHeight: 18,
    },

    error: {
      fontSize: 13,
      fontFamily: FONT.medium,
      color: colors.error,
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

    btnTextBase: {
      fontFamily: FONT.bold,
      fontSize: 14,
    },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
}
