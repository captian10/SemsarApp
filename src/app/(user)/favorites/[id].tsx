import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

export default function FavoriteDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const id = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return typeof raw === "string" ? raw.trim() : "";
  }, [params?.id]);

  if (!id) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "المفضلة" }} />
        <View style={styles.center}>
          <Text style={styles.title}>معرّف غير صالح</Text>
          <Text style={styles.sub}>
            ارجع وافتح الإعلان من المفضلة مرة تانية.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.btn}>
            <Text style={styles.btnText}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <Redirect href={{ pathname: "/(user)/home/[id]", params: { id } }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: THEME.dark[100],
    textAlign: "center",
  },
  sub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "center",
  },
  btn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: THEME.primary,
  },
  btnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 13,
  },
});
