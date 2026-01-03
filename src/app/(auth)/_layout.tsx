import { useAuth } from "@providers/AuthProvider";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { THEME } from "@/constants/Colors";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  const { session } = useAuth();
  if (session) return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={THEME.dark[100]} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.dark[100], // dark, no white at bottom
  },
});
