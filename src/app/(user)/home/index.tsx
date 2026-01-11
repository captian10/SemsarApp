import HomeSectionRail from "@/components/HomeSectionRail";
import { FONT } from "@/constants/Typography";

import {
  PROPERTY_TYPES,
  usePropertyList,
  type PropertyRow,
} from "@api/properties";
import PropertyCard from "@components/PropertyCard";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMyFavorites, useToggleFavorite } from "@api/favorites";
import { useAppTheme } from "@providers/AppThemeProvider";

type PropertyType = (typeof PROPERTY_TYPES)[number];
type FilterType = "الكل" | PropertyType;
type Sort = "latest" | "price_asc" | "price_desc";

// ✅ Arabic-friendly normalize (fix: أرض/ارض + removes tashkeel, tatweel, extra spaces)
const normalize = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    // normalize alef variants
    .replace(/[أإآ]/g, "ا")
    // remove tatweel
    .replace(/ـ/g, "");

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function applyFilters(args: {
  list: PropertyRow[];
  type: FilterType;
  query: string;
  sort: Sort;
}) {
  const { list, type, query, sort } = args;

  const typeFiltered =
    type === "الكل"
      ? list
      : list.filter(
          (p: any) => normalize(p?.property_type) === normalize(type)
        );

  const q = normalize(query);
  const searched =
    q.length === 0
      ? typeFiltered
      : typeFiltered.filter((p: any) => {
          const title = normalize(p?.title);
          const city = normalize(p?.city);
          const address = normalize(p?.address);
          return title.includes(q) || city.includes(q) || address.includes(q);
        });

  const sorted = [...searched].sort((a: any, b: any) => {
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

  return sorted;
}

const sortLabel = (sort: Sort) =>
  sort === "latest"
    ? "الأحدث"
    : sort === "price_asc"
    ? "السعر: من الأقل للأعلي"
    : "السعر:  من الأعلي للأقل";

function pickLatest(list: PropertyRow[], n = 12) {
  return [...list]
    .sort(
      (a: any, b: any) =>
        new Date(b?.created_at ?? 0).getTime() -
        new Date(a?.created_at ?? 0).getTime()
    )
    .slice(0, n);
}

function pickType(list: PropertyRow[], type: PropertyType, n = 12) {
  const t = normalize(type);
  return list.filter((p: any) => normalize(p?.property_type) === t).slice(0, n);
}

type UIColors = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  error: string;
};

export default function HomeScreen() {
  const router = useRouter();

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

  const { data, error, isLoading, isFetching, refetch } = usePropertyList();

  const { data: favRows } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  const [type, setType] = useState<FilterType>("الكل");
  const [sort, setSort] = useState<Sort>("latest");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  // sheet
  const [filterOpen, setFilterOpen] = useState(false);
  const [tmpType, setTmpType] = useState<FilterType>(type);
  const [tmpSort, setTmpSort] = useState<Sort>(sort);

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

  const list = useMemo(
    () => (data ?? []).filter(Boolean) as PropertyRow[],
    [data]
  );

  // ✅ (Optional) debug: see actual types in DB
  // useEffect(() => {
  //   const set = new Set(list.map((p: any) => p?.property_type).filter(Boolean));
  //   console.log("DB property_type values:", Array.from(set));
  // }, [list]);

  const filtered = useMemo(() => {
    return applyFilters({
      list,
      type,
      query: debouncedQuery,
      sort,
    });
  }, [list, type, debouncedQuery, sort]);

  const filtersActive = useMemo(() => {
    return type !== "الكل" || sort !== "latest" || normalize(query).length > 0;
  }, [type, sort, query]);

  const resetAll = useCallback(() => {
    setType("الكل");
    setSort("latest");
    setQuery("");
  }, []);

  const openSheet = useCallback(() => {
    setTmpType(type);
    setTmpSort(sort);
    setFilterOpen(true);
  }, [type, sort]);

  const applySheet = useCallback(() => {
    setType(tmpType);
    setSort(tmpSort);
    setFilterOpen(false);
  }, [tmpType, tmpSort]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ✅ IMPORTANT FIX: build rails for ALL property types (not only first 3)
  const rails = useMemo(() => {
    const latest = pickLatest(list, 12);

    const typeRails = PROPERTY_TYPES.map((t) => ({
      key: `type-${t}`,
      title: t,
      items: pickType(list, t, 12),
      params: { title: t, type: t, sort: "latest" as Sort },
    })).filter((s) => s.items && s.items.length > 0);

    return [
      {
        key: "latest",
        title: "أحدث الإعلانات",
        items: latest,
        params: { title: "أحدث الإعلانات", sort: "latest" as Sort },
      },
      ...typeRails,
    ].filter((s) => s.items && s.items.length > 0);
  }, [list]);

  function TypeChip({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function RadioRow({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.radioRow,
          active && styles.radioRowActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.radioRight}>
          <Text style={[styles.radioText, active && styles.radioTextActive]}>
            {label}
          </Text>
        </View>

        <View style={[styles.radioDot, active && styles.radioDotActive]}>
          {active ? <View style={styles.radioDotInner} /> : null}
        </View>
      </Pressable>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.searchCard}>
            <View style={styles.searchWrap}>
              <FontAwesome name="search" size={14} color={tokens.ink45} />
              <Text style={styles.searchPlaceholder}>ابحث…</Text>
            </View>
          </View>
        </View>

        <View style={styles.stateCard}>
          <ActivityIndicator color={ui.primary} />
          <Text style={styles.stateTitle}>جاري تحميل العقارات</Text>
          <Text style={styles.stateText}>لحظة واحدة…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <FontAwesome name="search" size={14} color={tokens.ink45} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث بالعنوان / المدينة / العنوان التفصيلي"
                placeholderTextColor={tokens.ink35}
                style={styles.searchInput}
              />
              {!!query && (
                <Pressable
                  onPress={() => setQuery("")}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={10}
                >
                  <FontAwesome name="times" size={12} color={tokens.ink60} />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={openSheet}
              style={({ pressed }) => [
                styles.filterBtn,
                filtersActive && styles.filterBtnActive,
                pressed && styles.pressed,
              ]}
              hitSlop={10}
            >
              <FontAwesome
                name="sliders"
                size={14}
                color={filtersActive ? "#fff" : ui.text}
              />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {sortLabel(sort)}
              {type !== "الكل" ? ` • ${type}` : ""}
              {filtersActive ? ` • ${filtered.length} نتيجة` : ""}
            </Text>

            {filtersActive && (
              <Pressable
                onPress={resetAll}
                style={({ pressed }) => [
                  styles.resetPill,
                  pressed && styles.pressed,
                ]}
                hitSlop={10}
              >
                <FontAwesome name="undo" size={12} color={ui.primary} />
                <Text style={styles.resetPillText}>تصفير</Text>
              </Pressable>
            )}
          </View>

          {/* Chips */}
          <FlatList
            data={["الكل", ...PROPERTY_TYPES] as FilterType[]}
            keyExtractor={(item) => String(item)}
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            renderItem={({ item }) => (
              <TypeChip
                label={item}
                active={type === item}
                onPress={() => setType(item)}
              />
            )}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.stateCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>حصل خطأ</Text>
          <Text style={styles.stateText}>فشل تحميل العقارات. جرّب تاني.</Text>

          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : filtersActive ? (
        <FlatList
          key="grid-2"
          data={filtered}
          keyExtractor={(item, index) => String((item as any)?.id ?? index)}
          numColumns={2}
          renderItem={({ item }) => {
            if (!item) return null;
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            filtered.length === 0 && styles.contentEmpty,
          ]}
          columnWrapperStyle={filtered.length ? styles.row : undefined}
          refreshControl={
            <RefreshControl
              refreshing={!!isFetching}
              onRefresh={onRefresh}
              tintColor={ui.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome name="search" size={18} color={ui.primary} />
              </View>
              <Text style={styles.emptyTitle}>مفيش نتائج</Text>
              <Text style={styles.emptySub}>
                جرّب تغيّر النوع أو الترتيب أو ابحث باسم المنطقة/العنوان.
              </Text>

              <Pressable
                onPress={resetAll}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.ghostBtnText}>تصفير الفلاتر</Text>
              </Pressable>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={<View style={{ height: 16 }} />}
        />
      ) : (
        <FlatList
          key="rails"
          data={rails}
          keyExtractor={(s) => s.key}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={!!isFetching}
              onRefresh={onRefresh}
              tintColor={ui.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 14 }}
          renderItem={({ item }) => {
            const isLatest = item.key === "latest";

            return (
              <View style={{ marginBottom: isLatest ? 8 : 12 }}>
                <HomeSectionRail
                  title={item.title}
                  variant={isLatest ? "micro" : "compact"}
                  data={item.items as any}
                  hrefBase="/(user)/home"
                  isFavorite={(id) => isFav(id)}
                  onToggleFavorite={onToggleFavorite}
                  onPressSeeAll={() =>
                    router.push({
                      pathname: "/(user)/home/see-all",
                      params: item.params as any,
                    })
                  }
                />
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 10 }} />}
        />
      )}

      {/* Bottom Sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setFilterOpen(false)}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>فلترة</Text>

            <Pressable
              onPress={() => setFilterOpen(false)}
              style={({ pressed }) => [
                styles.sheetClose,
                pressed && styles.pressed,
              ]}
              hitSlop={10}
            >
              <FontAwesome name="times" size={14} color={ui.text} />
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>نوع العقار</Text>
          <View>
            <RadioRow
              label="الكل"
              active={tmpType === "الكل"}
              onPress={() => setTmpType("الكل")}
            />
            {PROPERTY_TYPES.map((t) => (
              <RadioRow
                key={t}
                label={t}
                active={tmpType === t}
                onPress={() => setTmpType(t)}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>الترتيب</Text>
          <View>
            <RadioRow
              label="الأحدث"
              active={tmpSort === "latest"}
              onPress={() => setTmpSort("latest")}
            />
            <RadioRow
              label="السعر: من الأقل للأعلي"
              active={tmpSort === "price_asc"}
              onPress={() => setTmpSort("price_asc")}
            />
            <RadioRow
              label="السعر:  من الأعلي للأقل"
              active={tmpSort === "price_desc"}
              onPress={() => setTmpSort("price_desc")}
            />
          </View>

          <View style={styles.sheetFooter}>
            <Pressable
              onPress={() => {
                setTmpType("الكل");
                setTmpSort("latest");
              }}
              style={({ pressed }) => [
                styles.sheetGhost,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.sheetGhostText}>تصفير</Text>
            </Pressable>

            <Pressable
              onPress={applySheet}
              style={({ pressed }) => [
                styles.sheetPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.sheetPrimaryText}>تطبيق</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: UIColors, isDark: boolean) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink03 = `rgba(${ink},0.03)`;
  const ink06 = `rgba(${ink},0.06)`;
  const ink08 = `rgba(${ink},0.08)`;
  const ink10 = `rgba(${ink},0.10)`;
  const ink25 = `rgba(${ink},0.25)`;
  const ink35 = `rgba(${ink},0.35)`;
  const ink45 = `rgba(${ink},0.45)`;
  const ink60 = `rgba(${ink},0.60)`;
  const ink70 = `rgba(${ink},0.70)`;

  const primarySoft = `rgba(59,130,246,${isDark ? "0.18" : "0.10"})`;
  const primaryBorder = `rgba(59,130,246,${isDark ? "0.35" : "0.28"})`;

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    topBar: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },

    searchCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.045,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 2 : 1,
    },

    searchRow: { flexDirection: "row-reverse", alignItems: "center" },

    searchWrap: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ink08,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : ink03,
    },

    searchInput: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: 12.5,
      color: colors.text,
      textAlign: "right",
      paddingVertical: 0,
      marginLeft: 8,
    },

    searchPlaceholder: {
      fontFamily: FONT.medium,
      fontSize: 12.5,
      color: ink35,
      textAlign: "right",
      flex: 1,
    },

    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ink06,
      marginRight: 8,
    },

    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: ink10,
      marginLeft: 10,
    },

    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    metaRow: {
      marginTop: 8,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },

    metaText: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: 11.5,
      color: ink60,
      textAlign: "right",
    },

    resetPill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: primarySoft,
      borderWidth: 1,
      borderColor: primaryBorder,
    },

    resetPillText: {
      fontFamily: FONT.bold,
      fontSize: 11.5,
      color: colors.primary,
      marginRight: 6,
    },

    chipsRow: {
      marginTop: 8,
      paddingBottom: 2,
      paddingRight: 2,
      paddingLeft: 2,
    },

    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ink10,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : ink03,
      marginLeft: 8,
    },

    chipActive: {
      backgroundColor: primarySoft,
      borderColor: primaryBorder,
    },

    chipText: {
      fontSize: 11.5,
      fontFamily: FONT.bold,
      color: colors.text,
    },

    chipTextActive: { color: colors.primary },

    content: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 18 },
    contentEmpty: { flexGrow: 1, justifyContent: "center" },

    row: { justifyContent: "space-between" },
    col: { flex: 1, maxWidth: "50%", paddingHorizontal: 6 },

    stateCard: {
      marginHorizontal: 12,
      marginTop: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      alignItems: "center",
    },

    stateTitle: {
      fontSize: 13,
      fontFamily: FONT.bold,
      color: colors.text,
      textAlign: "center",
      marginTop: 8,
    },

    stateText: {
      fontSize: 11.5,
      fontFamily: FONT.regular,
      color: ink60,
      textAlign: "center",
      marginTop: 4,
    },

    errorIcon: { fontSize: 20 },
    errorTitle: {
      fontSize: 13.5,
      fontFamily: FONT.bold,
      color: colors.error,
      textAlign: "center",
      marginTop: 6,
    },

    primaryBtn: {
      marginTop: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 14,
      alignItems: "center",
      width: "100%",
    },

    primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

    pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

    emptyWrap: { alignItems: "center", paddingHorizontal: 16 },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primarySoft,
      borderWidth: 1,
      borderColor: primaryBorder,
      marginBottom: 8,
    },

    emptyTitle: {
      fontSize: 15,
      fontFamily: FONT.bold,
      color: colors.text,
      textAlign: "center",
      marginBottom: 6,
    },

    emptySub: {
      fontSize: 12,
      fontFamily: FONT.regular,
      color: ink60,
      textAlign: "center",
      lineHeight: 18,
    },

    ghostBtn: {
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: primaryBorder,
      backgroundColor: primarySoft,
      alignItems: "center",
      minWidth: 160,
    },

    ghostBtnText: {
      color: colors.primary,
      fontFamily: FONT.bold,
      fontSize: 13,
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(15,23,42,0.45)",
    },

    sheet: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: ink08,
    },

    sheetHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    sheetTitle: {
      fontSize: 15,
      fontFamily: FONT.bold,
      color: colors.text,
    },

    sheetClose: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ink06,
    },

    sectionTitle: {
      marginTop: 8,
      marginBottom: 8,
      fontSize: 11.5,
      fontFamily: FONT.bold,
      color: ink70,
      textAlign: "right",
    },

    radioRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ink10,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : ink03,
      marginBottom: 8,
    },

    radioRowActive: {
      backgroundColor: primarySoft,
      borderColor: primaryBorder,
    },

    radioRight: { flex: 1, alignItems: "flex-end" },

    radioText: {
      fontSize: 12.5,
      fontFamily: FONT.bold,
      color: colors.text,
      textAlign: "right",
    },

    radioTextActive: { color: colors.primary },

    radioDot: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: ink25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      marginLeft: 10,
    },

    radioDotActive: { borderColor: colors.primary },

    radioDotInner: {
      width: 9,
      height: 9,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },

    sheetFooter: {
      flexDirection: "row-reverse",
      marginTop: 10,
    },

    sheetGhost: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ink10,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : ink03,
      alignItems: "center",
      marginLeft: 10,
    },

    sheetGhostText: {
      fontSize: 13,
      fontFamily: FONT.bold,
      color: colors.text,
    },

    sheetPrimary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
    },

    sheetPrimaryText: {
      fontSize: 13,
      fontFamily: FONT.bold,
      color: "#fff",
    },
  });

  return {
    styles,
    tokens: { ink35, ink45, ink60 },
  };
}
