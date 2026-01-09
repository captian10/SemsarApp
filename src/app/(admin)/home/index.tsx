import { FONT } from "@/constants/Typography";
import {
  PROPERTY_TYPES,
  usePropertyList,
  type PropertyRow,
} from "@api/properties";
import PropertyCard from "@components/PropertyCard";
import { THEME } from "@constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type PropertyType = (typeof PROPERTY_TYPES)[number];
type FilterType = "الكل" | PropertyType;
type Sort = "latest" | "price_asc" | "price_desc";
type ViewMode = "grid" | "list";

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

export default function HomeScreen() {
  const { data, error, isLoading, isFetching, refetch } = usePropertyList();

  const [type, setType] = useState<FilterType>("الكل");
  const [sort, setSort] = useState<Sort>("latest");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const numColumns = viewMode === "grid" ? 2 : 1;

  const [filterOpen, setFilterOpen] = useState(false);

  const [tmpType, setTmpType] = useState<FilterType>(type);
  const [tmpSort, setTmpSort] = useState<Sort>(sort);

  const list = useMemo(() => (data ?? []) as PropertyRow[], [data]);

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

  const resetAll = () => {
    setType("الكل");
    setSort("latest");
    setQuery("");
  };

  const openSheet = () => {
    setTmpType(type);
    setTmpSort(sort);
    setFilterOpen(true);
  };

  const applySheet = () => {
    setType(tmpType);
    setSort(tmpSort);
    setFilterOpen(false);
  };

  const sortLabel =
    sort === "latest" ? "الأحدث" : sort === "price_asc" ? "السعر ↑" : "السعر ↓";

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.searchCard}>
            <View style={styles.searchWrap}>
              <FontAwesome
                name="search"
                size={14}
                color="rgba(15,23,42,0.45)"
              />
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

  const Header = (
    <View style={styles.topBar}>
      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <FontAwesome name="search" size={14} color="rgba(15,23,42,0.45)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث"
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
            {sortLabel}
            {type !== "الكل" ? ` • ${type}` : ""}
            {filtersActive ? ` • ${filtered.length} نتيجة` : ""}
          </Text>

          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode("grid")}
              style={({ pressed }) => [
                styles.viewBtn,
                viewMode === "grid" && styles.viewBtnActive,
                pressed && styles.pressed,
              ]}
              hitSlop={10}
            >
              <FontAwesome
                name="th-large"
                size={13}
                color={viewMode === "grid" ? "#fff" : "rgba(15,23,42,0.65)"}
              />
            </Pressable>
            <Pressable
              onPress={() => setViewMode("list")}
              style={({ pressed }) => [
                styles.viewBtn,
                viewMode === "list" && styles.viewBtnActive,
                pressed && styles.pressed,
              ]}
              hitSlop={10}
            >
              <FontAwesome
                name="list"
                size={13}
                color={viewMode === "list" ? "#fff" : "rgba(15,23,42,0.65)"}
              />
            </Pressable>
          </View>

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
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        key={`admin-home-cols-${numColumns}`}
        data={error ? [] : filtered}
        keyExtractor={(item) => String((item as any).id)}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={numColumns === 2 ? styles.col : styles.col1}>
            <PropertyCard
              property={item as any}
              hrefBase="/(admin)/home"
              size={numColumns === 2 ? "small" : "default"}
            />
          </View>
        )}
        ListHeaderComponent={Header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          !error && filtered.length === 0 && styles.contentEmpty,
        ]}
        columnWrapperStyle={
          numColumns === 2 && !error && filtered.length ? styles.row : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={() => refetch()}
            tintColor={THEME.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          error ? (
            <View style={styles.stateCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>حصل خطأ</Text>
              <Text style={styles.stateText}>
                فشل تحميل العقارات. جرّب تاني.
              </Text>

              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome name="search" size={18} color={THEME.primary} />
              </View>
              <Text style={styles.emptyTitle}>مفيش نتائج</Text>
              <Text style={styles.emptySub}>
                جرّب تغيّر النوع أو ابحث باسم المنطقة/العنوان.
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
          )
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: numColumns === 2 ? 12 : 10 }} />
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

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
          <View style={styles.optionsWrap}>
            <OptionChip
              label="الكل"
              active={tmpType === "الكل"}
              onPress={() => setTmpType("الكل")}
            />
            {PROPERTY_TYPES.map((t) => (
              <OptionChip
                key={t}
                label={t}
                active={tmpType === t}
                onPress={() => setTmpType(t)}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>الترتيب</Text>
          <View style={styles.sortRow}>
            <SortOption
              label="الأحدث"
              active={tmpSort === "latest"}
              onPress={() => setTmpSort("latest")}
            />
            <SortOption
              label="السعر ↑"
              active={tmpSort === "price_asc"}
              onPress={() => setTmpSort("price_asc")}
            />
            <SortOption
              label="السعر ↓"
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

function OptionChip({
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

function SortOption({
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
        styles.sortOption,
        active && styles.sortOptionActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.sortOptionText, active && styles.sortOptionTextActive]}
      >
        {label}
      </Text>
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

  viewToggle: {
    flexDirection: "row-reverse",
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnActive: {
    backgroundColor: THEME.primary,
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

  content: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  contentEmpty: { flexGrow: 1, justifyContent: "center" },
  row: { justifyContent: "space-between" },

  col: { flex: 1, maxWidth: "50%", paddingHorizontal: 6 },
  col1: { flex: 1, width: "100%", paddingHorizontal: 0 },

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

  // Sheet
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

  optionsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(15,23,42,0.03)",
  },
  chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { fontSize: 12, fontFamily: FONT.bold, color: THEME.dark[100] },
  chipTextActive: { color: "#fff" },

  sortRow: { flexDirection: "row-reverse", gap: 10 },
  sortOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(15,23,42,0.03)",
    alignItems: "center",
  },
  sortOptionActive: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.35)",
  },
  sortOptionText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },
  sortOptionTextActive: { color: THEME.primary },

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
