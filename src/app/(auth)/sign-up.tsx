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

const cleanPhone = (v: string) =>
  v.replace(/[^\d+]/g, "").replace(/\s+/g, "").trim();

const SignUpScreen = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // ✅ NEW
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      cleanPhone(phone).length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !loading
    );
  }, [email, phone, password, confirmPassword, loading]);

  async function signUpWithEmail() {
    const e = email.trim();
    const p = password.trim();
    const cp = confirmPassword.trim();
    const ph = cleanPhone(phone);

    if (!e || !ph || !p || !cp) {
      Alert.alert(
        "تنبيه",
        "من فضلك اكتب البريد الإلكتروني ورقم الهاتف وكلمة المرور وتأكيدها."
      );
      return;
    }

    // ✅ تحقق بسيط للهاتف (عدّله حسب بلدك)
    if (ph.length < 8) {
      Alert.alert("تنبيه", "رقم الهاتف غير صحيح.");
      return;
    }

    if (p.length < 6) {
      Alert.alert("تنبيه", "كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    if (p !== cp) {
      Alert.alert("تنبيه", "كلمة المرور وتأكيد كلمة المرور غير متطابقين.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: {
          // ✅ useful for confirmation flows
          data: { phone: ph },
        },
      });

      if (error) {
        Alert.alert("خطأ", error.message);
        return;
      }

      // ✅ ALWAYS use data.user.id (works even if session is null)
      const userId = data.user?.id ?? data.session?.user?.id;

      if (userId) {
        // ✅ write phone into profiles (upsert)
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              phone: ph,
              // role: "USER", // optional (your DB already has DEFAULT 'USER')
            },
            { onConflict: "id" }
          );

        if (upsertErr) {
          console.log("[profiles upsert phone] error:", upsertErr);
          // ما نوقفش التسجيل، بس نعرض تنبيه بسيط
          Alert.alert(
            "تم إنشاء الحساب",
            "الحساب اتعمل، لكن حصلت مشكلة بسيطة في حفظ رقم الهاتف. ادخل على البروفايل وحدّثه."
          );
          return;
        }
      }

      Alert.alert("تم", "تم إنشاء الحساب بنجاح.");
    } catch (err: any) {
      Alert.alert("خطأ", err?.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>إنشاء حساب</Text>
          <Text style={styles.subtitle}>
            ادخل البريد الإلكتروني ورقم الهاتف وكلمة المرور
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

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="01xxxxxxxxx"
              placeholderTextColor={THEME.gray[100]}
              style={[styles.input, styles.inputRtl]}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "phone-pad"}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>كلمة المرور</Text>

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

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={styles.label}>تأكيد كلمة المرور</Text>

            <View style={styles.inputWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={THEME.gray[100]}
                style={[styles.input, styles.inputRtl, styles.inputWithIcon]}
                secureTextEntry={!showConfirm}
                editable={!loading}
              />

              <Pressable
                onPress={() => setShowConfirm((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={10}
              >
                <FontAwesome
                  name={showConfirm ? "eye-slash" : "eye"}
                  size={18}
                  color={THEME.gray[100]}
                />
              </Pressable>
            </View>
          </View>

          <Button
            onPress={signUpWithEmail}
            disabled={!canSubmit}
            text={loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>هل لديك حساب بالفعل؟</Text>
            <View style={styles.divider} />
          </View>

          <Link href="/sign-in" asChild>
            <Pressable
              disabled={loading}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>تسجيل الدخول</Text>
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

  inputWrap: ViewStyle;
  input: TextStyle;
  inputRtl: TextStyle;
  inputEmail: TextStyle;
  inputWithIcon: TextStyle;
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
    textAlign: "right",
  },

  inputRtl: {
    textAlign: "right",
  },

  inputEmail: {
    textAlign: "right",
  },

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

export default SignUpScreen;
