import { useMyRequests } from "@api/requests";
import RequestListItem from "@components/RequestListItem";
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

function SimpleButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function RequestsScreen() {
  const { data: requests, isLoading, isFetching, error, refetch } =
    useMyRequests();

  const list = useMemo(() => requests ?? [], [requests]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.mutedText}>جاري التحميل…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.title}>التقديمات</Text>
          <Text style={styles.errorText}>حصل خطأ في تحميل التقديمات</Text>
          <SimpleButton label="إعادة المحاولة" onPress={refetch} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Simple header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>عدد التقديمات: {list.length}</Text>
        </View>


      </View>

      <FlatList
        data={list}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => (
          <RequestListItem {...({ request: item } as any)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[
          styles.listContent,
          list.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>مفيش تقديمات</Text>
            <Text style={styles.mutedText}>
              لما تبعت طلب على أي عقار هتلاقيه هنا.
            </Text>
            <SimpleButton label="تحديث" onPress={refetch} />
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

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  title: {
    fontSize: 20,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  subTitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
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
    color: THEME.dark[100],
    fontFamily: FONT.medium,
  },

  listContent: {
    paddingBottom: 12,
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
    fontSize: 16,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  mutedText: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
    lineHeight: 18,
  },

  errorText: {
    fontSize: 13,
    color: THEME.error,
    fontFamily: FONT.medium,
    textAlign: "center",
  },

  btn: {
    marginTop: 4,
    alignSelf: "stretch",
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },

  btnPressed: {
    opacity: 0.9,
  },
});
