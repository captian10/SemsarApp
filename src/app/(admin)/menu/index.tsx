import { useProductList } from "@api/products";
import ProductListItem from "@components/ProductListItem";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { THEME } from "../../../constants/Colors";

const CATEGORIES = [
  "بيتزا",
  "كريب",
  "سندوتشات",
  "وجبات",
  "مكرونة",
  "وجبات أخرى",
] as const;

type Category = (typeof CATEGORIES)[number];
type CategoryOrAll = "الكل" | Category;

export default function MenuScreen() {
  const { data: products, error, isLoading, refetch } = useProductList();
  const [selected, setSelected] = useState<CategoryOrAll>("الكل");

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (selected === "الكل") return list;
    return list.filter((p: any) => (p.category ?? "وجبات أخرى") === selected);
  }, [products, selected]);

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorText}>Failed to fetch products</Text>
        <Pressable onPress={() => refetch?.()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ✅ Categories chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          label="الكل"
          active={selected === "الكل"}
          onPress={() => setSelected("الكل")}
        />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            active={selected === c}
            onPress={() => setSelected(c)}
          />
        ))}
      </ScrollView>

      <FlatList
        key={"two-cols"} // ✅ مهم لو كنت غيّرت numColumns قبل كده
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.col}>
            <ProductListItem product={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row} // ✅ توزيع
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {selected === "الكل"
              ? "لا توجد منتجات حالياً"
              : `لا توجد منتجات في قسم "${selected}"`}
          </Text>
        }
      />
    </View>
  );
}

function Chip({
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
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F1F1EEFF" },

  // states
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: { color: "#B00020" },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  retryText: { fontWeight: "700" },

  // chips
  chipsRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
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
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // grid
  content: { padding: 12, paddingBottom: 24 },
  row: { justifyContent: "space-between" },
  col: {
    flex: 1, // ✅ ده اللي بيضمن نص الصف
    maxWidth: "50%", // ✅ يمنع آخر عنصر ياخد 100%
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  emptyText: {
    padding: 16,
    textAlign: "center",
    color: "#6B7280",
  },
});
