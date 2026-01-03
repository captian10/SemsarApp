import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@lib/supabase";
import { Link, Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
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
  v
    .replace(/[^\d+]/g, "")
    .replace(/\s+/g, "")
    .trim();

const DEFAULT_ROLE: "user" | "admin" = "user";

const SignUpScreen = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      cleanPhone(phone).length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !loading
    );
  }, [fullName, email, phone, password, confirmPassword, loading]);

  async function signUpWithEmail() {
    const name = fullName.trim();
    const e = email.trim();
    const p = password.trim();
    const cp = confirmPassword.trim();
    const ph = cleanPhone(phone);

    if (!name || !e || !ph || !p || !cp) {
      Alert.alert(
        "تنبيه",
        "من فضلك اكتب الاسم الثلاثي والبريد الإلكتروني ورقم الهاتف وكلمة المرور وتأكيدها."
      );
      return;
    }

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
          data: {
            full_name: name,
            phone: ph,
            role: DEFAULT_ROLE,
          },
        },
      });

      if (error) {
        Alert.alert("خطأ", error.message);
        return;
      }

      const userId = data.user?.id ?? data.session?.user?.id;

      if (userId) {
        const { error: upsertErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            full_name: name,
            phone: ph,
            role: DEFAULT_ROLE,
          },
          { onConflict: "id" }
        );

        if (upsertErr) {
          console.log("[profiles upsert] error:", upsertErr);
          Alert.alert(
            "تم إنشاء الحساب",
            "الحساب اتعمل، لكن حصلت مشكلة بسيطة في حفظ البيانات الإضافية. يمكنك تعديلها من صفحة البروفايل."
          );
          return;
        }
      }

      Alert.alert(
        "تم",
        "تم إنشاء الحساب بنجاح. لو تفعيل البريد مفعّل، يرجى فحص البريد الإلكتروني."
      );
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
        contentContainerStyle={[
          styles.container,
          keyboardVisible ? styles.containerTop : styles.containerCenter,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top hero / brand */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>أنشئ حسابك للحجز بسهولة</Text>
          <Text style={styles.heroSubtitle}>
            احفظ بياناتك لتستكشف المحلات والشقق المتاحة، وتتابع حجوزاتك في مكان
            واحد.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات المستخدم</Text>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.label}>الاسم الثلاثي</Text>
            <View style={styles.inputWrapperSurface}>
              <FontAwesome
                name="user-o"
                size={16}
                color={THEME.gray[100]}
                style={styles.leadingIcon}
              />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="مثال: أحمد محمد علي"
                placeholderTextColor={THEME.gray[100]}
                style={[styles.input, styles.inputRtl, styles.inputWithLeading]}
                editable={!loading}
              />
            </View>
          </View>

          {/* Email */}
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

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <View style={styles.inputWrapperSurface}>
              <FontAwesome
                name="phone"
                size={16}
                color={THEME.gray[100]}
                style={styles.leadingIcon}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="01xxxxxxxxx"
                placeholderTextColor={THEME.gray[100]}
                style={[styles.input, styles.inputRtl, styles.inputWithLeading]}
                keyboardType={
                  Platform.OS === "ios" ? "number-pad" : "phone-pad"
                }
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
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

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={styles.label}>تأكيد كلمة المرور</Text>

            <View style={styles.inputWrapperSurface}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={THEME.gray[100]}
                style={[
                  styles.input,
                  styles.inputRtl,
                  styles.inputWithLeading,
                  styles.inputWithTrailing,
                ]}
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

          <View style={styles.helperRow}>
            <View style={styles.helperPill}>
              <View style={styles.helperDot} />
              <Text style={styles.helperText}>
                كلمة مرور قوية تحمي حسابك وحجوزاتك
              </Text>
            </View>
          </View>

          <Button
            onPress={signUpWithEmail}
            disabled={!canSubmit}
            text={loading ? "جاري إنشاء الحساب..." : "إنشاء  الحساب "}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>هل لديك حساب بالفعل؟</Text>
            <View style={styles.divider} />
          </View>

          <Link href="/sign-in" asChild>
            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.linkText}>تسجيل الدخول إلى حسابي</Text>
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
  containerCenter: ViewStyle;
  containerTop: ViewStyle;

  hero: ViewStyle;
  heroIconWrap: ViewStyle;
  appName: TextStyle;
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;

  card: ViewStyle;
  sectionTitle: TextStyle;

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

  dividerSoft: ViewStyle;
  dividerRow: ViewStyle;
  divider: ViewStyle;
  dividerText: TextStyle;

  helperRow: ViewStyle;
  helperPill: ViewStyle;
  helperDot: ViewStyle;
  helperText: TextStyle;

  linkBtn: ViewStyle;
  linkText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.dark[100], // light booking feel
  },

  container: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 40, // 👈 extra padding from top
    flexGrow: 1,
    gap: 18,
  },
  containerCenter: {
    justifyContent: "flex-start", // start but with paddingTop so it visually sits lower
  },
  containerTop: {
    justifyContent: "flex-start",
    paddingTop: 24, // slightly less when keyboard is open
  },

  hero: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#E5EDFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 13,
    color: THEME.gray[200],
    fontFamily: FONT.medium,
  },
  heroTitle: {
    fontSize: 20,
    color: THEME.white.DEFAULT,
    textAlign: "center",
    fontFamily: FONT.bold,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.gray[100],
    textAlign: "center",
    fontFamily: FONT.regular,
    paddingHorizontal: 12,
  },

  card: {
    backgroundColor: THEME.white[100],
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.white[200],
  },

  sectionTitle: {
    fontSize: 14,
    color: THEME.gray[200],
    fontFamily: FONT.bold,
    textAlign: "right",
    marginBottom: 2,
  },

  field: { gap: 6 },
  label: {
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "right",
    fontFamily: FONT.medium,
  },

  inputWrapperSurface: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: THEME.gray[200],
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
    left: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  dividerSoft: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 12,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  helperRow: {
    alignItems: "flex-end",
  },
  helperPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  helperDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: THEME.primary,
  },
  helperText: {
    fontSize: 11,
    color: THEME.gray[200],
    fontFamily: FONT.medium,
  },

  linkBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginTop: 4,
  },
  linkText: {
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 14,
    textAlign: "center",
  },

  pressed: { opacity: 0.85 },
});

export default SignUpScreen;
