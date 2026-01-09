import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@lib/supabase";
import { Link, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import Button from "../../components/Button";
import { THEME } from "../../constants/Colors";

const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !loading,
    [email, password, loading]
  );

  async function signInWithEmail() {
    const e = email.trim();
    const p = password.trim();

    if (!e || !p) {
      Alert.alert("تنبيه", "من فضلك اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });

      if (error) {
        Alert.alert("خطأ", error.message);
        return;
      }
    } catch (err: any) {
      Alert.alert("خطأ", err?.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image on top */}
        <View style={styles.imageWrap}>
          <Image
            source={require("../../../assets/images/S.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>تطبيق سمسار للحجز والإستعلام</Text>
          <Text style={styles.subtitle}>
            ادخل البريد الإلكتروني وكلمة المرور
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <View style={styles.inputWrapperSurface}>
              <FontAwesome
                name="envelope-o"
                size={16}
                color={THEME.gray[100]}
                style={styles.leadingIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@gmail.com"
                placeholderTextColor={THEME.gray[100]}
                style={[
                  styles.input,
                  styles.inputEmail,
                  styles.inputWithLeading,
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>كلمة المرور</Text>

            <View style={styles.inputWrapperSurface}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={THEME.gray[100]}
                style={[
                  styles.input,
                  styles.inputRtl,
                  styles.inputWithLeading,
                  styles.inputWithTrailing,
                ]}
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

  imageWrap: ViewStyle;
  heroImage: ImageStyle;

  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;

  card: ViewStyle;

  field: ViewStyle;
  label: TextStyle;

  inputWrapperSurface: ViewStyle;
  inputWrap: ViewStyle;
  input: TextStyle;
  inputRtl: TextStyle;
  inputEmail: TextStyle;
  inputWithLeading: TextStyle;
  inputWithTrailing: TextStyle;
  leadingIcon: TextStyle;
  eyeBtn: ViewStyle;

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
    backgroundColor: THEME.dark[100],
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
    backgroundColor: "transparent",
  },

  imageWrap: {
    alignItems: "center",
    marginBottom: 4,
  },
  heroImage: {
    width: 200,
    height: 200,
  },

  header: {
    gap: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
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
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 16,
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

  inputWrapperSurface: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 12,
  },

  inputWrap: {
    position: "relative",
    width: "100%",
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.dark[100],
    fontFamily: FONT.regular,
  },

  inputRtl: {
    textAlign: "right",
  },

  inputEmail: {
    textAlign: "right",
  },

  inputWithLeading: {
    paddingLeft: 4,
  },

  inputWithTrailing: {
    paddingLeft: 40,
  },

  leadingIcon: {
    marginLeft: 8,
    marginRight: 6,
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
    marginTop: 4,
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
