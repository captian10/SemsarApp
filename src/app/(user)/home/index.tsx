import { FONT } from "@/constants/Typography";
import {
  PROPERTY_TYPES,
  usePropertyList,
  type PropertyRow,
} from "@api/properties";
import PropertyCard from "@components/PropertyCard";
import HomeSectionRail from "@/components/HomeSectionRail";
import { THEME } from "@constants/Colors";
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

type PropertyType = (typeof PROPERTY_TYPES)[number];
type FilterType = "الكل" | PropertyType;
type Sort = "latest" | "price_asc" | "price_desc";

const normalize = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

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
      : list.filter((p: any) => normalize(p?.property_type) === normalize(type));

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
    ? "السعر: الأقل → الأعلى"
    : "السعر: الأعلى → الأقل";

/* ----------------- Chips ----------------- */

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

/* ----------------- helpers: pick rails ----------------- */

function pickLatest(list: PropertyRow[], n = 12) {
  return [...list]
    .sort(
      (a: any, b: any) =>
        new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime()
    )
    .slice(0, n);
}

function pickType(list: PropertyRow[], type: PropertyType, n = 12) {
  const t = normalize(type);
  return list
    .filter((p: any) => normalize(p?.property_type) === t)
    .slice(0, n);
}

function pickPriceDesc(list: PropertyRow[], n = 12) {
  return [...list]
    .sort((a: any, b: any) => Number(b?.price ?? 0) - Number(a?.price ?? 0))
    .slice(0, n);
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, error, isLoading, isFetching, refetch } = usePropertyList();

  // ✅ favorites
  const { data: favRows } = useMyFavorites();
  const toggleFav = useToggleFavorite();

  // UI state
  const [type, setType] = useState<FilterType>("الكل");
  const [sort, setSort] = useState<Sort>("latest");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  // sheet
  const [filterOpen, setFilterOpen] = useState(false);
  const [tmpType, setTmpType] = useState<FilterType>(type);
  const [tmpSort, setTmpSort] = useState<Sort>(sort);

  // ✅ Favorites set from DB
  const favoriteIds = useMemo(() => {
    const ids = (favRows ?? []).map((r: any) => String(r.property_id));
    return new Set(ids);
  }, [favRows]);

  // ✅ Optimistic overrides (fast UI)
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

      // optimistic UI
      setOptimisticFav((prev) => ({ ...prev, [id]: next }));

      toggleFav.mutate(
        { propertyId: id, next },
        {
          onError: (err: any) => {
            // rollback
            setOptimisticFav((prev) => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
            });
            Alert.alert("خطأ", err?.message ?? "لم نستطع تحديث المفضلة");
          },
          onSettled: () => {
            // let the server be the source of truth after invalidation
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
    () => ((data ?? []).filter(Boolean) as PropertyRow[]),
    [data]
  );

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

  // ✅ Rails data (Dubizzle style) - only when no filters
  const rails = useMemo(() => {
    const latest = pickLatest(list, 12);
    const featured = pickPriceDesc(list, 12);

    // choose 2-3 popular types (you can change)
    const t1 = PROPERTY_TYPES[0];
    const t2 = PROPERTY_TYPES[1];
    const t3 = PROPERTY_TYPES[2];

    return [
      {
        key: "latest",
        title: "أحدث الإعلانات",
        items: latest,
        params: { title: "أحدث الإعلانات", sort: "latest" as Sort },
      },
      {
        key: "featured",
        title: "الأعلى سعرًا",
        items: featured,
        params: { title: "الأعلى سعرًا", sort: "price_desc" as Sort },
      },
      ...(t1
        ? [
            {
              key: `type-${t1}`,
              title: t1,
              items: pickType(list, t1, 12),
              params: { title: t1, type: t1, sort: "latest" as Sort },
            },
          ]
        : []),
      ...(t2
        ? [
            {
              key: `type-${t2}`,
              title: t2,
              items: pickType(list, t2, 12),
              params: { title: t2, type: t2, sort: "latest" as Sort },
            },
          ]
        : []),
      ...(t3
        ? [
            {
              key: `type-${t3}`,
              title: t3,
              items: pickType(list, t3, 12),
              params: { title: t3, type: t3, sort: "latest" as Sort },
            },
          ]
        : []),
    ].filter((s) => s.items && s.items.length);
  }, [list]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.searchCard}>
            <View style={styles.searchWrap}>
              <FontAwesome name="search" size={14} color="rgba(15,23,42,0.45)" />
              <Text style={styles.searchPlaceholder}>ابحث…</Text>
            </View>
          </View>
        </View>

        <View style={styles.stateCard}>
          <ActivityIndicator color={THEME.primary} />
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
              <FontAwesome name="search" size={14} color="rgba(15,23,42,0.45)" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث بالعنوان / المدينة / العنوان التفصيلي"
                placeholderTextColor={"rgba(15,23,42,0.35)"}
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
                  <FontAwesome
                    name="times"
                    size={12}
                    color="rgba(15,23,42,0.55)"
                  />
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
                color={filtersActive ? "#fff" : THEME.dark[100]}
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
                <FontAwesome name="undo" size={12} color={THEME.primary} />
                <Text style={styles.resetPillText}>تصفير</Text>
              </Pressable>
            )}
          </View>

          {/* ✅ Chips (type) */}
          <FlatList
            data={["الكل", ...PROPERTY_TYPES] as FilterType[]}
            keyExtractor={(item) => String(item)}
            horizontal
            inverted // ✅ RTL
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
        // ✅ when user is searching/filtering -> show grid
        
        <FlatList
        key='grid-2'
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
              tintColor={THEME.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome name="search" size={18} color={THEME.primary} />
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
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      ) : (
        // ✅ Dubizzle mode (rails) when no filters
        <FlatList
        key='rails'
          data={rails}
          keyExtractor={(s) => s.key}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={!!isFetching}
              onRefresh={onRefresh}
              tintColor={THEME.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 16 }}>
              <HomeSectionRail
                title={item.title}
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
          )}
          ListFooterComponent={<View style={{ height: 12 }} />}
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
              <FontAwesome name="times" size={14} color={THEME.dark[100]} />
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>نوع العقار</Text>
          <View style={styles.radioWrap}>
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
          <View style={styles.radioWrap}>
            <RadioRow
              label="الأحدث"
              active={tmpSort === "latest"}
              onPress={() => setTmpSort("latest")}
            />
            <RadioRow
              label="السعر: الأقل → الأعلى"
              active={tmpSort === "price_asc"}
              onPress={() => setTmpSort("price_asc")}
            />
            <RadioRow
              label="السعر: الأعلى → الأقل"
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
        {active && <View style={styles.radioDotInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
  topBar: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },

  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    padding: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },

  searchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },

  searchWrap: {
    flex: 1,
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
  searchPlaceholder: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: "rgba(15,23,42,0.35)",
    textAlign: "right",
    flex: 1,
  },

  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.06)",
  },

  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  filterBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaText: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "rgba(15,23,42,0.60)",
    textAlign: "right",
  },
  resetPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
  },
  resetPillText: { fontFamily: FONT.bold, fontSize: 12, color: THEME.primary },

  /* ✅ Chips */
  chipsRow: {
    marginTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(15,23,42,0.03)",
  },
  chipActive: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.35)",
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },
  chipTextActive: { color: THEME.primary },

  content: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  contentEmpty: { flexGrow: 1, justifyContent: "center" },
  row: { justifyContent: "space-between" },
  col: { flex: 1, maxWidth: "50%", paddingHorizontal: 6 },

  stateCard: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "center",
  },
  stateText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "center",
  },

  errorIcon: { fontSize: 22 },
  errorTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: THEME.error,
    textAlign: "center",
  },

  primaryBtn: {
    marginTop: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  emptyWrap: { alignItems: "center", paddingHorizontal: 16, gap: 8 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },
  ghostBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.22)",
    backgroundColor: "rgba(59,130,246,0.08)",
    alignItems: "center",
    minWidth: 160,
  },
  ghostBtnText: { color: THEME.primary, fontFamily: FONT.bold, fontSize: 13 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.06)",
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: FONT.bold,
    color: "rgba(15,23,42,0.70)",
    textAlign: "right",
  },

  radioWrap: { gap: 8 },
  radioRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(15,23,42,0.03)",
  },
  radioRowActive: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.35)",
  },
  radioRight: { flex: 1, alignItems: "flex-end" },
  radioText: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  radioTextActive: { color: THEME.primary },

  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(15,23,42,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  radioDotActive: { borderColor: THEME.primary },
  radioDotInner: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: THEME.primary,
  },

  sheetFooter: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 14,
  },
  sheetGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(15,23,42,0.03)",
    alignItems: "center",
  },
  sheetGhostText: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },
  sheetPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
  },
  sheetPrimaryText: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: "#fff",
  },
});
