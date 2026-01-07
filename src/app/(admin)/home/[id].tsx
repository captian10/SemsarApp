// (admin)/home/[id].tsx
// ✅ Admin Property Details Screen (1:1 image + buttons next to each other)

import { useDeleteProperty, useProperty } from "@api/properties";
import { usePropertyContact } from "@api/property-contacts";
import RemoteImage from "@components/RemoteImage";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
import { defaultPropertyImage } from "../../../components/PropertyCard";

const statusLabels: Record<string, string> = {
  available: "متاح",
  sold: "للبيع",
  rented: "للإيجار",
  pending: "قيد المراجعة",
  hidden: "مخفي",
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
};

export default function AdminPropertyDetailsScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams();

  const id = useMemo(() => {
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    return typeof raw === "string" ? raw.trim() : "";
  }, [idParam]);

  const { data: property, error, isLoading, refetch } = useProperty(id);
  const { mutate: deleteProperty, isPending: isDeleting } = useDeleteProperty();

  // ✅ contact info (Admin-only by RLS)
  const { data: contact } = usePropertyContact(id);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const copyText = async (text: string, title = "تم النسخ") => {
    const v = String(text ?? "").trim();
    if (!v) return;
    await Clipboard.setStringAsync(v);
    Alert.alert(title, `تم نسخ: ${v}`);
  };

  const priceText = useMemo(() => {
    const p = Number(property?.price);
    if (!Number.isFinite(p)) return "0";
    return p.toLocaleString("ar-EG");
  }, [property?.price]);

  const currencyText = useMemo(() => {
    const c = String(property?.currency ?? "EGP").trim().toUpperCase();
    if (c === "EGP") return "جنيه";
    return c;
  }, [property?.currency]);

  const typeText = useMemo(
    () => property?.property_type ?? "—",
    [property?.property_type]
  );

  const statusText = useMemo(() => {
    const s = String(property?.status ?? "").trim();
    return s ? statusLabels[s] ?? s : "—";
  }, [property?.status]);

  const descriptionText = useMemo(() => {
    const d = property?.description?.trim();
    return d && d.length ? d : "—";
  }, [property?.description]);

  const locationText = useMemo(() => {
    const city = property?.city?.trim() ?? "";
    const address = property?.address?.trim() ?? "";
    if (!city && !address) return "—";
    return [city, address].filter(Boolean).join("، ");
  }, [property?.city, property?.address]);

  // ✅ optional specs: hide if null/0
  const specsText = useMemo(() => {
    const b = Number(property?.bedrooms ?? 0);
    const ba = Number(property?.bathrooms ?? 0);
    const a = Number(property?.area_sqm ?? 0);

    const bedrooms = Number.isFinite(b) && b > 0 ? `${b} غرف` : "";
    const bathrooms = Number.isFinite(ba) && ba > 0 ? `${ba} حمامات` : "";
    const area = Number.isFinite(a) && a > 0 ? `${a} م²` : "";

    return [bedrooms, bathrooms, area].filter(Boolean).join(" • ") || "—";
  }, [property?.bedrooms, property?.bathrooms, property?.area_sqm]);

  // ✅ owner contact (optional)
  const ownerName = useMemo(() => safeText(contact?.owner_name, ""), [contact]);
  const ownerPhone = useMemo(() => safeText(contact?.owner_phone, ""), [contact]);
  const hasOwner = useMemo(
    () => Boolean(ownerName.trim() || ownerPhone.trim()),
    [ownerName, ownerPhone]
  );

  const onDelete = () => {
    if (!id || isDeleting) return;

    deleteProperty(id, {
      onSuccess: () => router.replace("/(admin)"),
      onError: (err: any) => {
        Alert.alert("خطأ", err?.message || "فشل حذف العقار");
      },
    });
  };

  const confirmDelete = () => {
    if (!id || isDeleting) return;

    Alert.alert("تأكيد الحذف", "هل أنت متأكد أنك تريد حذف هذا العقار؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: onDelete },
    ]);
  };

  if (!id) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>معرّف العقار غير صحيح</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityLabel="رجوع"
        >
          <Text style={styles.retryText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.stateText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>
          {(error as any)?.message || "فشل تحميل البيانات."}
        </Text>

        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityLabel="إعادة المحاولة"
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "تفاصيل العقار",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: THEME.white.DEFAULT },
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 16,
            color: THEME.dark[100],
          },
          headerRight: () => (
            <Link
              href={{
                pathname: "/(admin)/home/create",
                params: { id: property.id },
              }}
              asChild
            >
              <Pressable
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityLabel="تعديل العقار"
              >
                <FontAwesome name="pencil" size={18} color={THEME.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Image Card */}
        <View style={styles.imageCard}>
          <RemoteImage
            path={property.cover_image}
            fallback={defaultPropertyImage}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.badge}>
            <Text style={styles.badgePrice}>{priceText}</Text>
            <Text style={styles.badgeCurrency}>{currencyText}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {property.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {String(property.id).slice(0, 8)}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>النوع</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {typeText}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>الحالة</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>الوصف</Text>
          <Text style={styles.description}>{descriptionText}</Text>

          <Text style={styles.sectionTitle}>الموقع</Text>
          <Text style={styles.sub}>{locationText}</Text>

          <Text style={styles.sectionTitle}>المواصفات</Text>
          <Text style={styles.sub}>{specsText}</Text>

          {/* ✅ Owner contact (Admin only) */}
          {hasOwner && (
            <>
              <Text style={styles.sectionTitle}>صاحب العقار</Text>

              <View style={styles.ownerCard}>
                {!!ownerName.trim() && (
                  <View style={styles.ownerRow}>
                    <Text style={styles.ownerLabel}>الاسم</Text>

                    <Pressable
                      onPress={() => copyText(ownerName, "تم نسخ الاسم")}
                      onLongPress={() => copyText(ownerName, "تم نسخ الاسم")}
                      style={({ pressed }) => [
                        styles.ownerValuePress,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="نسخ اسم صاحب العقار"
                    >
                      <View style={styles.ownerValueRow}>
                        <Text style={styles.ownerValue}>{ownerName}</Text>
                        <FontAwesome name="copy" size={14} color={THEME.primary} />
                      </View>
                    </Pressable>
                  </View>
                )}

                {!!ownerPhone.trim() && (
                  <View style={styles.ownerRow}>
                    <Text style={styles.ownerLabel}>الرقم</Text>

                    <Pressable
                      onPress={() => copyText(ownerPhone, "تم نسخ رقم الموبايل")}
                      onLongPress={() => copyText(ownerPhone, "تم نسخ رقم الموبايل")}
                      style={({ pressed }) => [
                        styles.ownerValuePress,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="نسخ رقم صاحب العقار"
                    >
                      <View style={styles.ownerValueRow}>
                        <Text style={styles.ownerValue}>{ownerPhone}</Text>
                        <FontAwesome name="copy" size={14} color={THEME.primary} />
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          <Text style={styles.subHint}>
            يمكنك تعديل العقار من زر القلم بالأعلى.
          </Text>

          {/* ✅ Buttons next to each other */}
          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(admin)/home/create",
                  params: { id: property.id },
                })
              }
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="تعديل العقار"
            >
              <Text style={styles.actionBtnText}>تعديل</Text>
            </Pressable>

            <Pressable
              onPress={isDeleting ? undefined : confirmDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && !isDeleting ? { opacity: 0.85 } : null,
                isDeleting ? { opacity: 0.6 } : null,
              ]}
              disabled={isDeleting}
              accessibilityLabel="حذف العقار"
            >
              <Text style={styles.deleteBtnText}>
                {isDeleting ? "جاري الحذف..." : "حذف"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = {
  screen: ViewStyle;
  content: ViewStyle;
  stateWrap: ViewStyle;
  stateText: TextStyle;
  errorTitle: TextStyle;
  retryBtn: ViewStyle;
  retryText: TextStyle;
  iconBtn: ViewStyle;
  imageCard: ViewStyle;
  image: ImageStyle;
  badge: ViewStyle;
  badgePrice: TextStyle;
  badgeCurrency: TextStyle;
  info: ViewStyle;
  title: TextStyle;
  sectionTitle: TextStyle;
  description: TextStyle;
  sub: TextStyle;
  subHint: TextStyle;
  metaRow: ViewStyle;
  metaPill: ViewStyle;
  metaLabel: TextStyle;
  metaValue: TextStyle;

  ownerCard: ViewStyle;
  ownerRow: ViewStyle;
  ownerLabel: TextStyle;
  ownerValue: TextStyle;
  ownerValuePress: ViewStyle;
  ownerValueRow: ViewStyle;

  actions: ViewStyle;
  actionBtn: ViewStyle;
  actionBtnText: TextStyle;
  deleteBtn: ViewStyle;
  deleteBtnText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
  content: { padding: 16, paddingBottom: 32, gap: 16 },

  stateWrap: {
    flex: 1,
    backgroundColor: THEME.white[100],
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    color: THEME.error,
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 12,
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

  iconBtn: {
    marginRight: 12,
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.10)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
  },

  imageCard: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  image: { width: "100%", aspectRatio: 1, borderRadius: 16 },

  badge: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.24)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgePrice: { fontSize: 14, color: THEME.primary, fontFamily: FONT.bold },
  badgeCurrency: {
    fontSize: 12,
    color: THEME.primary,
    fontFamily: FONT.medium,
  },

  info: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  title: {
    fontSize: 20,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
    writingDirection: "rtl",
  },

  sectionTitle: {
    fontSize: 16,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
    marginTop: 8,
    writingDirection: "rtl",
  },

  description: {
    fontSize: 14,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
    lineHeight: 20,
    writingDirection: "rtl",
  },

  sub: {
    fontSize: 14,
    color: THEME.dark[100],
    fontFamily: FONT.regular,
    textAlign: "right",
    writingDirection: "rtl",
  },

  subHint: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
    marginTop: 8,
    writingDirection: "rtl",
  },

  metaRow: { flexDirection: "row-reverse", gap: 10, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15,23,42,0.03)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: "100%",
  },
  metaLabel: { fontSize: 12, color: THEME.gray[100], fontFamily: FONT.medium },
  metaValue: { fontSize: 13, color: THEME.dark[100], fontFamily: FONT.bold },

  // ✅ owner card
  ownerCard: {
    backgroundColor: "rgba(15,23,42,0.03)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  ownerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ownerLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
  },
  ownerValue: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  ownerValuePress: { flex: 1 },
  ownerValueRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },

  actions: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 24,
  },

  actionBtn: {
    flex: 1,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

  deleteBtn: {
    flex: 1,
    backgroundColor: THEME.error,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

  pressed: { opacity: 0.9 },
});
