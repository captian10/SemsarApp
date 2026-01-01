import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@lib/supabase";
import { Link, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import Button from "../../components/Button";
import { THEME } from "../../constants/Colors";

const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false); // ✅ جديد
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("تنبيه", "من فضلك اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) Alert.alert("خطأ", error.message);

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>تسجيل الدخول</Text>
          <Text style={styles.subtitle}>
            ادخل البريد الإلكتروني وكلمة المرور
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@gmail.com"
              placeholderTextColor={THEME.gray[100]}
              style={[styles.input, styles.inputEmail]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>كلمة المرور</Text>

            {/* ✅ Wrapper عشان العين */}
            <View style={styles.inputWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={THEME.gray[100]}
                style={[styles.input, styles.inputRtl, styles.inputWithIcon]}
                secureTextEntry={!showPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={10}
              >
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={18}
                  color={THEME.gray[100]}
                />
              </Pressable>
            </View>
          </View>

          <Button
            onPress={signInWithEmail}
            disabled={!canSubmit}
            text={loading ? "جاري تسجيل الدخول..." : "دخول"}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.divider} />
          </View>

          <Link href="/sign-up" asChild>
            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.linkText}>إنشاء حساب جديد</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

type Styles = {
  screen: ViewStyle;
  container: ViewStyle;

  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;

  card: ViewStyle;

  field: ViewStyle;
  label: TextStyle;

  inputWrap: ViewStyle; // ✅ جديد
  input: TextStyle;
  inputRtl: TextStyle;
  inputEmail: TextStyle;
  inputWithIcon: TextStyle; // ✅ جديد
  eyeBtn: ViewStyle; // ✅ جديد

  dividerRow: ViewStyle;
  divider: ViewStyle;
  dividerText: TextStyle;

  linkBtn: ViewStyle;
  linkText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    justifyContent: "center",
    flexGrow: 1,
    gap: 12,
    backgroundColor: "transparent",
  },

  header: {
    gap: 6,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    color: THEME.white.DEFAULT,
    textAlign: "center",
    fontFamily: FONT.bold,
  },
  subtitle: {
    fontSize: 13,
    color: "#F2F2F2",
    textAlign: "center",
    fontFamily: FONT.regular,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  field: { gap: 6 },
  label: {
    fontSize: 12,
    color: THEME.dark[100],
    textAlign: "right",
    fontFamily: FONT.medium,
  },

  // ✅ Wrapper للعين
  inputWrap: {
    position: "relative",
    width: "100%",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: THEME.white[100],
    borderRadius: 14,
    fontSize: 15,
    color: THEME.dark[100],
    fontFamily: FONT.regular,
    alignSelf: "stretch",
  },

  // عربي
  inputRtl: {
    textAlign: "right",
  },

  // Email أفضل LTR
  inputEmail: {
    textAlign: "right",
  },

  // ✅ عشان العين ما تغطي النص
  inputWithIcon: {
    paddingLeft: 44,
  },

  eyeBtn: {
    position: "absolute",
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#EDEDED",
  },
  dividerText: {
    fontSize: 12,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  linkBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
  },
  linkText: {
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 14,
    textAlign: "center",
    alignSelf: "center",
  },

  pressed: { opacity: 0.85 },
});

export default SignInScreen;
