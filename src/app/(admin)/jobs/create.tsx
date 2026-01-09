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
import { THEME } from "@constants/Colors";

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

  if (isEdit && isLoadingJob) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "تعديل وظيفة" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.muted}>جاري تحميل بيانات الوظيفة…</Text>
        </View>
      </View>
    );
  }

  if (isEdit && jobError) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "تعديل وظيفة" }} />
        <View style={styles.center}>
          <Text style={styles.title}>مش لاقيين الوظيفة</Text>
          <Text style={styles.muted}>تأكد إن الوظيفة موجودة.</Text>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryBtnText}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pageTitle = isEdit ? "تعديل وظيفة" : "إضافة وظيفة";
  const submitLabel = isEdit ? "حفظ التعديلات" : "نشر الوظيفة";

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: pageTitle, headerTitleAlign: "center" }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات الوظيفة</Text>

          <Text style={styles.label}>عنوان الوظيفة *</Text>
          <TextInput
            value={form.title}
            onChangeText={(t) => setField("title", t)}
            placeholder="مثال: موظف مبيعات"
            placeholderTextColor={THEME.gray[100]}
            style={styles.input}
            textAlign="right"
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>الشركة</Text>
              <TextInput
                value={form.company}
                onChangeText={(t) => setField("company", t)}
                placeholder="اسم الشركة"
                placeholderTextColor={THEME.gray[100]}
                style={styles.input}
                textAlign="right"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>المكان</Text>
              <TextInput
                value={form.location}
                onChangeText={(t) => setField("location", t)}
                placeholder="مثال: قنا"
                placeholderTextColor={THEME.gray[100]}
                style={styles.input}
                textAlign="right"
              />
            </View>
          </View>

          <Text style={styles.label}>الراتب</Text>
          <TextInput
            value={form.salary}
            onChangeText={(t) => setField("salary", t)}
            placeholder="مثال: 8000 - 12000 جنيه"
            placeholderTextColor={THEME.gray[100]}
            style={styles.input}
            textAlign="right"
          />

          <Text style={styles.label}>الوصف</Text>
          <TextInput
            value={form.description}
            onChangeText={(t) => setField("description", t)}
            placeholder="اكتب تفاصيل الوظيفة (المهام، المتطلبات، المواعيد...)"
            placeholderTextColor={THEME.gray[100]}
            style={[styles.input, styles.textarea]}
            textAlign="right"
            multiline
          />
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
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
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>إلغاء</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
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
    color: THEME.dark[100],
    textAlign: "center",
  },
  muted: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    backgroundColor: THEME.white.DEFAULT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 14,
  },

  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.dark[100],
    textAlign: "right",
    marginBottom: 10,
  },

  label: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: THEME.dark[100],
    textAlign: "right",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.dark[100],
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
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    fontSize: 14,
  },
});
