import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { useCreateJob, useJob, useUpdateJob } from "@api/jobs";
import { useAppTheme } from "@providers/AppThemeProvider";

type FormState = {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
};

const emptyForm: FormState = {
  title: "",
  company: "",
  location: "",
  salary: "",
  description: "",
};

export default function AdminJobCreateOrEdit() {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const subtleBorder = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.10)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const placeholderColor = isDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(15,23,42,0.35)";

  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const jobId = params.id;

  const isEdit = !!jobId;

  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const { data: job, isLoading: isLoadingJob, error: jobError } = useJob(jobId);

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!isEdit) return;
    if (!job) return;

    setForm({
      title: job.title ?? "",
      company: job.company ?? "",
      location: job.location ?? "",
      salary: job.salary ?? "",
      description: job.description ?? "",
    });
  }, [isEdit, job]);

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 3 &&
      !createMutation.isPending &&
      !updateMutation.isPending
    );
  }, [form.title, createMutation.isPending, updateMutation.isPending]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    const title = form.title.trim();
    if (title.length < 3) {
      Alert.alert("تنبيه", "اكتب عنوان الوظيفة (على الأقل 3 حروف).");
      return;
    }

    const payload = {
      title,
      company: form.company.trim() || null,
      location: form.location.trim() || null,
      salary: form.salary.trim() || null,
      description: form.description.trim() || null,
      is_active: true,
    };

    try {
      if (isEdit && jobId) {
        const updated = await updateMutation.mutateAsync({
          id: jobId,
          ...payload,
        });
        Alert.alert("تم", "تم تحديث الوظيفة بنجاح ✅");
        router.replace(`/(admin)/jobs/${updated.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        Alert.alert("تم", "تم إضافة الوظيفة بنجاح ✅");
        router.replace(`/(admin)/jobs/${created.id}`);
      }
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حصل خطأ، حاول مرة أخرى.");
    }
  };

  const pageTitle = isEdit ? "تعديل وظيفة" : "إضافة وظيفة";
  const submitLabel = isEdit ? "حفظ التعديلات" : "نشر الوظيفة";

  const headerOptions = {
    title: pageTitle,
    headerTitleAlign: "center" as const,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: t.colors.bg },
    headerTintColor: t.colors.text,
    headerTitleStyle: {
      color: t.colors.text,
      fontFamily: FONT.bold,
      fontSize: 18,
    },
  };

  if (isEdit && isLoadingJob) {
    return (
      <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
          <Text style={[styles.muted, { color: t.colors.muted }]}>
            جاري تحميل بيانات الوظيفة…
          </Text>
        </View>
      </View>
    );
  }

  if (isEdit && jobError) {
    return (
      <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.center}>
          <Text style={[styles.title, { color: t.colors.text }]}>
            مش لاقيين الوظيفة
          </Text>
          <Text style={[styles.muted, { color: t.colors.muted }]}>
            تأكد إن الوظيفة موجودة.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border ?? subtleBorder,
              },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={[styles.secondaryBtnText, { color: t.colors.text }]}>
              رجوع
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
      <Stack.Screen options={headerOptions} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border ?? subtleBorder,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.colors.text }]}>
            بيانات الوظيفة
          </Text>

          <Text style={[styles.label, { color: t.colors.text }]}>
            عنوان الوظيفة *
          </Text>
          <TextInput
            value={form.title}
            onChangeText={(v) => setField("title", v)}
            placeholder="مثال: موظف مبيعات"
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: t.colors.border ?? subtleBorder,
                color: t.colors.text,
              },
            ]}
            textAlign="right"
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: t.colors.text }]}>
                الشركة
              </Text>
              <TextInput
                value={form.company}
                onChangeText={(v) => setField("company", v)}
                placeholder="اسم الشركة"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: t.colors.border ?? subtleBorder,
                    color: t.colors.text,
                  },
                ]}
                textAlign="right"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: t.colors.text }]}>
                المكان
              </Text>
              <TextInput
                value={form.location}
                onChangeText={(v) => setField("location", v)}
                placeholder="مثال: قنا"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: t.colors.border ?? subtleBorder,
                    color: t.colors.text,
                  },
                ]}
                textAlign="right"
              />
            </View>
          </View>

          <Text style={[styles.label, { color: t.colors.text }]}>الراتب</Text>
          <TextInput
            value={form.salary}
            onChangeText={(v) => setField("salary", v)}
            placeholder="مثال: 8000 - 12000 جنيه"
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: t.colors.border ?? subtleBorder,
                color: t.colors.text,
              },
            ]}
            textAlign="right"
          />

          <Text style={[styles.label, { color: t.colors.text }]}>الوصف</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => setField("description", v)}
            placeholder="اكتب تفاصيل الوظيفة (المهام، المتطلبات، المواعيد...)"
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              styles.textarea,
              {
                backgroundColor: inputBg,
                borderColor: t.colors.border ?? subtleBorder,
                color: t.colors.text,
              },
            ]}
            textAlign="right"
            multiline
          />
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: t.colors.primary },
            (!canSubmit || pressed) && { opacity: !canSubmit ? 0.5 : 0.9 },
          ]}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{submitLabel}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border ?? subtleBorder,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: t.colors.text }]}>
            إلغاء
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 12, paddingBottom: 18 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 18,
    textAlign: "center",
  },
  muted: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    textAlign: "right",
    marginBottom: 10,
    writingDirection: "rtl",
  },

  label: {
    fontFamily: FONT.medium,
    fontSize: 12,
    textAlign: "right",
    marginBottom: 6,
    marginTop: 10,
    writingDirection: "rtl",
  },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: FONT.regular,
    fontSize: 13,
    writingDirection: "rtl",
  },

  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  row2: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  primaryBtn: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
  },
});
