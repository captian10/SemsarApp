import { useAuth } from "@providers/AuthProvider";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

export default function AuthLayout() {
  const { session } = useAuth();
  if (session) return <Redirect href="/" />;

  return (
    <ImageBackground
      source={require("../../../assets/images/bg.png")}
      style={styles.bg}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#000", // fallback لو الصورة فيها شفافية
  },
  bgImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)", // اختياري
  },
});
