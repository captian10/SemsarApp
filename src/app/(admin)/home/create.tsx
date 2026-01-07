// (admin)/home/create.tsx

import {
  PROPERTY_STATUS,
  PROPERTY_TYPES,
  useDeleteProperty,
  useInsertProperty,
  useProperty,
  useUpdateProperty,
  type PropertyStatus,
  type PropertyType,
} from "@api/properties";

import {
  usePropertyContact,
  useUpsertPropertyContact,
} from "@api/property-contacts";

import { THEME } from "@constants/Colors";
import { supabase } from "@lib/supabase";
import { decode } from "base64-arraybuffer";
import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import Button from "../../../components/Button";
import { defaultPropertyImage as defaultPropertyImageUrl } from "../../../components/PropertyCard";

const BUCKET = "property-images";
const MAX_IMAGE_BYTES = 7_000_000;

// fallback image
const DEFAULT_IMAGE_SOURCE: ImageSourcePropType = {
  uri: defaultPropertyImageUrl,
};

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const normalizeNum = (v: string) =>
  String(v ?? "")
    .trim()
    .replace(/[٬،]/g, ",")
    .replace(",", ".");

const toFloatOrNull = (v: string) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(normalizeNum(s));
  return Number.isFinite(n) ? n : null;
};

const toIntOrNull = (v: string) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

const isLocalUri = (s?: string | null) => !!s && s.startsWith("file://");
const isHttpUrl = (s?: string | null) =>
  !!s && (s.startsWith("http://") || s.startsWith("https://"));

function getExt(uri: string) {
  return uri.split(".").pop()?.toLowerCase() ?? "jpg";
}

function getContentType(fileExt: string) {
  if (fileExt === "jpg" || fileExt === "jpeg") return "image/jpeg";
  if (fileExt === "webp") return "image/webp";
  return "image/png";
}

// ✅ Fix expo-image-picker warning (no MediaTypeOptions)
function getImagesMediaTypes(): any {
  const MT = (ImagePicker as any).MediaType;
  if (MT?.Images) return [MT.Images];
  return ["images"];
}

function isRlsError(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("row-level security") || msg.includes("rls");
}

const digitsOnly = (s: string) => String(s ?? "").replace(/\D/g, "");

type FormData = {
  coverImage: string | null;
  title: string;
  description: string;
  price: string;
  currency: string;
  city: string;
  address: string;

  // specs (optional)
  bedrooms: string;
  bathrooms: string;
  area: string;

  // ✅ owner contact (admin-only; stored in property_contacts)
  ownerName: string;
  ownerPhone: string;

  propertyType: PropertyType;
  status: PropertyStatus;
};

type FormAction =
  | { type: "UPDATE_FIELD"; field: keyof FormData; value: any }
  | { type: "RESET" };

const initialFormData: FormData = {
  coverImage: null,
  title: "",
  description: "",
  price: "",
  currency: "جنيه",
  city: "",
  address: "",
  bedrooms: "",
  bathrooms: "",
  area: "",

  ownerName: "",
  ownerPhone: "",

  propertyType: (PROPERTY_TYPES?.[0] ?? "شقة") as PropertyType,
  status: "available",
};

function formReducer(state: FormData, action: FormAction): FormData {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialFormData;
    default:
      return state;
  }
}

const Field = memo(function Field({
  label,
  value,
  onChangeText,
  placeholder,
  loading,
  keyboardType,
  multiline,
  numberOfLines,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  loading: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "phone-pad";
  multiline?: boolean;
  numberOfLines?: number;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.gray[100]}
        style={[
          styles.input,
          styles.inputRtl,
          multiline ? styles.inputMultiline : null,
        ]}
        editable={!loading}
        textAlign="right"
        blurOnSubmit={false}
        autoCorrect={false}
        keyboardType={keyboardType ?? "default"}
        multiline={!!multiline}
        numberOfLines={numberOfLines}
        accessibilityLabel={accessibilityLabel ?? label}
      />
    </View>
  );
});

const PriceInput = memo(function PriceInput({
  value,
  onChangeText,
  currency,
  loading,
}: {
  value: string;
  onChangeText: (t: string) => void;
  currency: string;
  loading: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>السعر</Text>

      <View style={styles.priceRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="مثال: 1500000"
          placeholderTextColor={THEME.gray[100]}
          style={[styles.input, styles.priceInput, styles.inputRtl]}
          keyboardType="decimal-pad"
          editable={!loading}
          textAlign="right"
          blurOnSubmit={false}
          autoCorrect={false}
          accessibilityLabel="السعر"
        />

        <View style={styles.currencyPill}>
          <Text style={styles.currencyText}>{String(currency || "جنيه")}</Text>
        </View>
      </View>
    </View>
  );
});

const PropertyTypeSelector = memo(function PropertyTypeSelector({
  propertyType,
  setPropertyType,
  loading,
}: {
  propertyType: PropertyType;
  setPropertyType: (t: PropertyType) => void;
  loading: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>نوع العقار</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="always"
      >
        {PROPERTY_TYPES.map((t) => {
          const active = propertyType === t;
          return (
            <Pressable
              key={t}
              onPress={() => setPropertyType(t)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : null,
                pressed ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
              disabled={loading}
              accessibilityLabel={`نوع العقار: ${t}`}
            >
              <Text
                style={[styles.chipText, active ? styles.chipTextActive : null]}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const StatusSelector = memo(function StatusSelector({
  status,
  setStatus,
  loading,
}: {
  status: PropertyStatus;
  setStatus: (s: PropertyStatus) => void;
  loading: boolean;
}) {
  const statusLabels: Record<string, string> = {
    available: "متاح",
    sold: "للبيع",
    rented: "للإيجار",
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>الحالة</Text>
      <View style={styles.statusRow}>
        {PROPERTY_STATUS.map((s) => {
          const active = status === s;
          const label = statusLabels[s] ?? s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={({ pressed }) => [
                styles.statusChip,
                active ? styles.statusChipActive : null,
                pressed ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
              disabled={loading}
              accessibilityLabel={`حالة العقار: ${label}`}
            >
              <Text
                style={[
                  styles.statusText,
                  active ? styles.statusTextActive : null,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export default function CreatePropertyScreen() {
  const router = useRouter();

  // params
  const { id: idParam } = useLocalSearchParams();
  const id = useMemo(() => {
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  }, [idParam]);

  const isUpdating = Boolean(id);

  // data hooks
  const { mutate: insertProperty } = useInsertProperty();
  const { mutate: updateProperty } = useUpdateProperty();
  const { mutate: deleteProperty } = useDeleteProperty();
  const { data: updatingProperty } = useProperty(isUpdating ? id : "");

  // ✅ owner contact hooks (admin-only by RLS)
  const { data: contact } = usePropertyContact(isUpdating ? id : "");
  const { mutateAsync: upsertContact } = useUpsertPropertyContact();

  // form state
  const [formData, dispatchForm] = useReducer(formReducer, initialFormData);

  // ✅ sections toggle
  const [showSpecs, setShowSpecs] = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  // refs to manage edit init
  const contactHadRowRef = useRef(false);
  const didInitContactRef = useRef(false);

  // errors and loading
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // preview image
  const imageSourceForPreview: ImageSourcePropType = useMemo(() => {
    const c = formData.coverImage;
    if (!c) return DEFAULT_IMAGE_SOURCE;

    if (isLocalUri(c) || isHttpUrl(c)) return { uri: c };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(c);
    return data?.publicUrl ? { uri: data.publicUrl } : DEFAULT_IMAGE_SOURCE;
  }, [formData.coverImage]);

  // fill fields when editing
  useEffect(() => {
    if (!updatingProperty) return;

    dispatchForm({
      type: "UPDATE_FIELD",
      field: "title",
      value: updatingProperty.title ?? "",
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "description",
      value: updatingProperty.description ?? "",
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "price",
      value:
        updatingProperty.price != null ? String(updatingProperty.price) : "",
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "currency",
      value: updatingProperty.currency ?? "جنيه",
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "city",
      value: updatingProperty.city ?? "",
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "address",
      value: updatingProperty.address ?? "",
    });

    const bedrooms =
      updatingProperty.bedrooms != null ? String(updatingProperty.bedrooms) : "";
    const bathrooms =
      updatingProperty.bathrooms != null
        ? String(updatingProperty.bathrooms)
        : "";
    const area =
      updatingProperty.area_sqm != null ? String(updatingProperty.area_sqm) : "";

    dispatchForm({ type: "UPDATE_FIELD", field: "bedrooms", value: bedrooms });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "bathrooms",
      value: bathrooms,
    });
    dispatchForm({ type: "UPDATE_FIELD", field: "area", value: area });

    if (
      (bedrooms && bedrooms.trim()) ||
      (bathrooms && bathrooms.trim()) ||
      (area && area.trim())
    ) {
      setShowSpecs(true);
    }

    dispatchForm({
      type: "UPDATE_FIELD",
      field: "propertyType",
      value: (PROPERTY_TYPES.includes(updatingProperty.property_type as any)
        ? updatingProperty.property_type
        : PROPERTY_TYPES?.[0] ?? "شقة") as PropertyType,
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "status",
      value: (PROPERTY_STATUS.includes(updatingProperty.status as any)
        ? updatingProperty.status
        : "available") as PropertyStatus,
    });
    dispatchForm({
      type: "UPDATE_FIELD",
      field: "coverImage",
      value: updatingProperty.cover_image ?? null,
    });
  }, [updatingProperty]);

  // ✅ init contact once on edit
  useEffect(() => {
    if (!isUpdating) return;
    if (didInitContactRef.current) return;

    // hook returns null when no row exists
    if (contact === undefined) return;

    didInitContactRef.current = true;

    if (contact?.property_id) {
      contactHadRowRef.current = true;

      const n = String(contact.owner_name ?? "");
      const p = String(contact.owner_phone ?? "");

      dispatchForm({ type: "UPDATE_FIELD", field: "ownerName", value: n });
      dispatchForm({ type: "UPDATE_FIELD", field: "ownerPhone", value: p });

      if (n.trim() || p.trim()) setShowOwner(true);
    }
  }, [isUpdating, contact]);

  const resetFields = () => {
    dispatchForm({ type: "RESET" });
    setShowSpecs(false);
    setShowOwner(false);
    didInitContactRef.current = false;
    contactHadRowRef.current = false;
  };

  const validateInput = () => {
    const newErrors: string[] = [];

    const title = formData.title.trim();
    if (!title) newErrors.push("عنوان العقار مطلوب");
    if (title.length > 100)
      newErrors.push("العنوان طويل جدًا (حد أقصى 100 حرف)");

    const p = toFloatOrNull(formData.price);
    if (!formData.price.trim()) newErrors.push("السعر مطلوب");
    else if (p == null) newErrors.push("السعر يجب أن يكون رقمًا صحيحًا");
    else if (p <= 0) newErrors.push("السعر يجب أن يكون أكبر من 0");
    else if (p > 1e10) newErrors.push("السعر كبير جدًا");

    // ✅ specs optional
    if (formData.bedrooms.trim()) {
      const b = toIntOrNull(formData.bedrooms);
      if (b == null) newErrors.push("عدد الغرف غير صحيح");
      else if (b < 0 || b > 50) newErrors.push("عدد الغرف غير منطقي");
    }

    if (formData.bathrooms.trim()) {
      const ba = toIntOrNull(formData.bathrooms);
      if (ba == null) newErrors.push("عدد الحمامات غير صحيح");
      else if (ba < 0 || ba > 50) newErrors.push("عدد الحمامات غير منطقي");
    }

    if (formData.area.trim()) {
      const a = toFloatOrNull(formData.area);
      if (a == null) newErrors.push("المساحة غير صحيحة");
      else if (a <= 0 || a > 1e6) newErrors.push("المساحة غير منطقية");
    }

    // ✅ owner phone optional (basic validation)
    if (formData.ownerPhone.trim()) {
      const d = digitsOnly(formData.ownerPhone);
      if (d.length < 7) newErrors.push("رقم موبايل صاحب العقار غير صحيح");
    }

    if (!formData.propertyType) newErrors.push("اختر نوع العقار");
    if (!formData.status) newErrors.push("اختر حالة العقار");

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const pickImage = async () => {
    if (loading) return;

    const { status: perm } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== "granted") {
      Alert.alert("مطلوب إذن", "من فضلك اسمح بالوصول للصور.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getImagesMediaTypes(),
      aspect: [1, 1],
      quality: 1,
      allowsEditing: true,
    });

    if (result.canceled) return;
    const selected = result.assets?.[0];
    if (!selected?.uri) return;

    try {
      const info = await FileSystem.getInfoAsync(selected.uri, {
        size: true,
      } as any);
      const size = (info as any)?.size as number | undefined;
      if (typeof size === "number" && size > MAX_IMAGE_BYTES) {
        Alert.alert("خطأ", "الصورة كبيرة جدًا. اختر صورة أقل من 7MB.");
        return;
      }
    } catch {}

    dispatchForm({
      type: "UPDATE_FIELD",
      field: "coverImage",
      value: selected.uri,
    });
  };

  // ✅ upload to ROOT: <uuid>.<ext>
  const uploadImage = async (localUri: string) => {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const ext = getExt(localUri);
    const filePath = `${randomUUID()}.${ext}`;
    const contentType = getContentType(ext);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, decode(base64), { contentType, upsert: false });

    if (error) {
      if (isRlsError(error)) {
        throw new Error(
          "RLS منع رفع الصورة في Storage. سياسات storage.objects عندك قد تمنع الرفع في root."
        );
      }
      throw new Error(error.message);
    }

    return data?.path ?? null;
  };

  const buildPayload = async (finalCover: string | null) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    if (!uid) {
      throw new Error(
        "أنت غير مسجل دخول (auth.uid() = null). اعمل Login من جديد."
      );
    }

    const payload: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,

      price: round2(toFloatOrNull(formData.price) ?? 0),
      currency: formData.currency.trim() || "جنيه",

      city: formData.city.trim() || null,
      address: formData.address.trim() || null,

      bedrooms: toIntOrNull(formData.bedrooms),
      bathrooms: toIntOrNull(formData.bathrooms),
      area_sqm: (() => {
        const a = toFloatOrNull(formData.area);
        return a == null ? null : round2(a);
      })(),

      property_type: formData.propertyType ?? null,
      status: formData.status ?? "available",

      cover_image: finalCover,
    };

    if (!isUpdating) payload.created_by = uid;

    return payload;
  };

  // ✅ sync owner contact after saving property
  const syncOwnerContact = async (propertyId: string) => {
    const owner_name = formData.ownerName.trim() || null;
    const owner_phone = formData.ownerPhone.trim() || null;

    // if user entered something -> upsert
    if (owner_name || owner_phone) {
      await upsertContact({ property_id: propertyId, owner_name, owner_phone });
      contactHadRowRef.current = true;
      return;
    }

    // if clearing existing row on update -> delete it
    if (isUpdating && contactHadRowRef.current) {
      const { error } = await supabase
        .from("property_contacts")
        .delete()
        .eq("property_id", propertyId);

      if (error) throw new Error(error.message);
      contactHadRowRef.current = false;
    }
  };

  const onCreate = async () => {
    setErrors([]);
    if (!validateInput()) return;

    try {
      setLoading(true);

      let coverPath: string | null = null;
      if (isLocalUri(formData.coverImage) && formData.coverImage) {
        coverPath = await uploadImage(formData.coverImage);
      }

      const payload = await buildPayload(coverPath);

      insertProperty(payload as any, {
        onSuccess: async (row: any) => {
          try {
            await syncOwnerContact(String(row?.id));
            resetFields();
            setLoading(false);
            router.back();
          } catch (e: any) {
            setLoading(false);
            setErrors([e?.message || "فشل حفظ بيانات صاحب العقار"]);
          }
        },
        onError: (err: any) => {
          setLoading(false);
          setErrors([err?.message || "فشل إضافة العقار"]);
        },
      });
    } catch (e: any) {
      setLoading(false);
      setErrors([e?.message || "فشل رفع الصورة"]);
    }
  };

  const onUpdate = async () => {
    setErrors([]);
    if (!validateInput()) return;

    try {
      setLoading(true);

      let finalCover: string | null = formData.coverImage;

      if (isLocalUri(formData.coverImage) && formData.coverImage) {
        finalCover = await uploadImage(formData.coverImage);
      }

      const payload = await buildPayload(finalCover);
      delete payload.created_by;

      updateProperty(
        { id, ...payload } as any,
        {
          onSuccess: async (row: any) => {
            try {
              await syncOwnerContact(String(row?.id ?? id));
              setLoading(false);
              router.back();
            } catch (e: any) {
              setLoading(false);
              setErrors([e?.message || "فشل حفظ بيانات صاحب العقار"]);
            }
          },
          onError: (err: any) => {
            setLoading(false);
            setErrors([err?.message || "فشل تحديث العقار"]);
          },
        }
      );
    } catch (e: any) {
      setLoading(false);
      setErrors([e?.message || "فشل رفع الصورة"]);
    }
  };

  const onSubmit = () => {
    if (isUpdating) onUpdate();
    else onCreate();
  };

  const onDelete = () => {
    if (!isUpdating || loading) return;

    setLoading(true);
    deleteProperty(id, {
      onSuccess: () => {
        setLoading(false);
        router.replace("/(admin)");
      },
      onError: (err: any) => {
        setLoading(false);
        Alert.alert("خطأ", err?.message || "فشل حذف العقار");
      },
    });
  };

  const confirmDelete = () => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد أنك تريد حذف هذا العقار؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Stack.Screen
          options={{
            title: isUpdating ? "تعديل عقار" : "إضافة عقار",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: THEME.white.DEFAULT },
            headerTitleStyle: {
              color: THEME.dark[100],
              fontFamily: FONT.bold,
              fontSize: 18,
            },
          }}
        />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isUpdating ? "تعديل بيانات العقار" : "إضافة عقار جديد"}
            </Text>
            <Text style={styles.subtitle}>
              أضف صورة الغلاف، العنوان، السعر، والمواصفات الأساسية.
            </Text>
          </View>

          <View style={styles.card}>
            {/* Cover Image */}
            <Pressable
              onPress={loading ? undefined : pickImage}
              style={({ pressed }) => [
                styles.imageWrap,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
              accessibilityLabel="اختيار صورة الغلاف"
            >
              <Image
                source={imageSourceForPreview}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>
                  {formData.coverImage ? "تغيير صورة الغلاف" : "اختيار صورة غلاف"}
                </Text>
              </View>
            </Pressable>

            <Field
              label="عنوان العقار"
              value={formData.title}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "title", value: v })
              }
              placeholder="مثال: شقة للبيع في مدينة نصر"
              loading={loading}
            />

            <Field
              label="وصف (اختياري)"
              value={formData.description}
              onChangeText={(v) =>
                dispatchForm({
                  type: "UPDATE_FIELD",
                  field: "description",
                  value: v,
                })
              }
              placeholder="اكتب وصف مختصر (المميزات – الدور – التشطيب...)"
              loading={loading}
              multiline
              numberOfLines={4}
            />

            <PropertyTypeSelector
              propertyType={formData.propertyType}
              setPropertyType={(v) =>
                dispatchForm({
                  type: "UPDATE_FIELD",
                  field: "propertyType",
                  value: v,
                })
              }
              loading={loading}
            />

            <StatusSelector
              status={formData.status}
              setStatus={(v) =>
                dispatchForm({
                  type: "UPDATE_FIELD",
                  field: "status",
                  value: v,
                })
              }
              loading={loading}
            />

            <PriceInput
              value={formData.price}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "price", value: v })
              }
              currency={formData.currency}
              loading={loading}
            />

            <Field
              label="المدينة (اختياري)"
              value={formData.city}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "city", value: v })
              }
              placeholder="مثال: القاهرة"
              loading={loading}
            />

            <Field
              label="العنوان (اختياري)"
              value={formData.address}
              onChangeText={(v) =>
                dispatchForm({
                  type: "UPDATE_FIELD",
                  field: "address",
                  value: v,
                })
              }
              placeholder="مثال: شارع أحمد عرابي – المهندسين"
              loading={loading}
            />

            {/* ✅ Owner Contact (Admin only) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHint}>صاحب العقار (للأدمن فقط)</Text>

              <Pressable
                onPress={() => setShowOwner((p) => !p)}
                style={({ pressed }) => [
                  styles.specToggle,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
                disabled={loading}
              >
                <Text style={styles.specToggleText}>
                  {showOwner ? "إخفاء" : "إضافة"}
                </Text>
              </Pressable>
            </View>

            {showOwner && (
              <>
                <Field
                  label="اسم صاحب العقار (اختياري)"
                  value={formData.ownerName}
                  onChangeText={(v) =>
                    dispatchForm({
                      type: "UPDATE_FIELD",
                      field: "ownerName",
                      value: v,
                    })
                  }
                  placeholder="مثال: أحمد محمد"
                  loading={loading}
                />

                <Field
                  label="رقم الموبايل (اختياري)"
                  value={formData.ownerPhone}
                  onChangeText={(v) =>
                    dispatchForm({
                      type: "UPDATE_FIELD",
                      field: "ownerPhone",
                      value: v,
                    })
                  }
                  placeholder="مثال: 01012345678"
                  loading={loading}
                  keyboardType={Platform.OS === "ios" ? "phone-pad" : "numeric"}
                />
              </>
            )}

            {/* ✅ Specs (optional section) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHint}>المواصفات (اختياري)</Text>

              <Pressable
                onPress={() => setShowSpecs((p) => !p)}
                style={({ pressed }) => [
                  styles.specToggle,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
                disabled={loading}
              >
                <Text style={styles.specToggleText}>
                  {showSpecs ? "إخفاء" : "إضافة"}
                </Text>
              </Pressable>
            </View>

            {showSpecs && (
              <View style={styles.grid3}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="غرف"
                    value={formData.bedrooms}
                    onChangeText={(v) =>
                      dispatchForm({
                        type: "UPDATE_FIELD",
                        field: "bedrooms",
                        value: v,
                      })
                    }
                    placeholder="مثال: 3"
                    loading={loading}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Field
                    label="حمامات"
                    value={formData.bathrooms}
                    onChangeText={(v) =>
                      dispatchForm({
                        type: "UPDATE_FIELD",
                        field: "bathrooms",
                        value: v,
                      })
                    }
                    placeholder="مثال: 2"
                    loading={loading}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Field
                    label="مساحة (م²)"
                    value={formData.area}
                    onChangeText={(v) =>
                      dispatchForm({
                        type: "UPDATE_FIELD",
                        field: "area",
                        value: v,
                      })
                    }
                    placeholder="مثال: 140"
                    loading={loading}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}

            {errors.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                {errors.map((err, idx) => (
                  <Text key={idx} style={styles.error}>
                    {err}
                  </Text>
                ))}
              </View>
            )}

            <Button
              onPress={onSubmit}
              text={
                loading
                  ? "جاري الحفظ..."
                  : isUpdating
                  ? "تحديث العقار"
                  : "إضافة العقار"
              }
              disabled={loading}
            />

            {isUpdating && (
              <Pressable
                onPress={loading ? undefined : confirmDelete}
                style={({ pressed }) => [
                  styles.delete,
                  pressed && !loading ? styles.pressed : null,
                  loading ? styles.disabled : null,
                ]}
                accessibilityLabel="حذف العقار"
              >
                <Text style={styles.deleteText}>حذف العقار</Text>
              </Pressable>
            )}

            {loading && <Text style={styles.loadingText}>جاري الحفظ...</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

type Styles = {
  screen: ViewStyle;
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  card: ViewStyle;

  inputRtl: any;

  imageWrap: ViewStyle;
  image: ImageStyle;
  imageOverlay: ViewStyle;
  imageOverlayText: TextStyle;

  field: ViewStyle;
  label: TextStyle;
  input: any;
  inputMultiline: any;

  priceRow: ViewStyle;
  currencyPill: ViewStyle;
  currencyText: TextStyle;
  priceInput: any;

  chipsRow: ViewStyle;
  chip: ViewStyle;
  chipActive: ViewStyle;
  chipText: TextStyle;
  chipTextActive: TextStyle;

  statusRow: ViewStyle;
  statusChip: ViewStyle;
  statusChipActive: ViewStyle;
  statusText: TextStyle;
  statusTextActive: TextStyle;

  sectionHeaderRow: ViewStyle;
  sectionHint: TextStyle;
  specToggle: ViewStyle;
  specToggleText: TextStyle;

  grid3: ViewStyle;

  error: TextStyle;
  delete: ViewStyle;
  deleteText: TextStyle;
  loadingText: TextStyle;

  pressed: ViewStyle;
  disabled: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
  container: { padding: 16, paddingBottom: 40 },

  header: { paddingHorizontal: 2, marginBottom: 10 },
  title: {
    fontSize: 22,
    color: THEME.dark[100],
    textAlign: "right",
    fontFamily: FONT.bold,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    color: THEME.gray[100],
    textAlign: "right",
    fontFamily: FONT.regular,
  },

  card: {
    backgroundColor: THEME.white.DEFAULT,
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  imageWrap: {
    borderRadius: 18,
    backgroundColor: THEME.white[100],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    position: "relative",
    marginBottom: 12,
  },
  image: { width: "100%", aspectRatio: 16 / 9 },
  imageOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  imageOverlayText: {
    color: THEME.white.DEFAULT,
    fontSize: 12,
    fontFamily: FONT.bold,
  },

  field: { marginBottom: 12 },
  label: {
    fontSize: 12,
    marginBottom: 6,
    color: THEME.dark[100],
    textAlign: "right",
    fontFamily: FONT.medium,
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
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top" as const,
  },
  inputRtl: { writingDirection: "rtl" as const },

  chipsRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: THEME.white[100],
  },
  chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { fontSize: 12, color: THEME.dark[100], fontFamily: FONT.medium },
  chipTextActive: { color: THEME.white.DEFAULT, fontFamily: FONT.bold },

  statusRow: { flexDirection: "row-reverse", gap: 10, flexWrap: "wrap" },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#fff",
    minWidth: 92,
    alignItems: "center",
  },
  statusChipActive: {
    backgroundColor: "rgba(59,130,246,0.12)",
    borderColor: "rgba(59,130,246,0.28)",
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },
  statusTextActive: { color: THEME.primary },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  currencyPill: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  currencyText: { color: THEME.white.DEFAULT, fontFamily: FONT.bold },
  priceInput: { flex: 1 },

  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionHint: {
    textAlign: "right",
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 13,
  },
  specToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    backgroundColor: "rgba(59,130,246,0.10)",
  },
  specToggleText: {
    fontFamily: FONT.bold,
    fontSize: 12,
    color: THEME.primary,
  },

  grid3: { flexDirection: "row-reverse", gap: 10 },

  error: {
    color: THEME.error,
    textAlign: "right",
    marginTop: 4,
    fontFamily: FONT.medium,
  },

  delete: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: THEME.error,
    alignItems: "center",
  },
  deleteText: { color: THEME.white.DEFAULT, fontFamily: FONT.bold },

  loadingText: {
    textAlign: "right",
    marginTop: 10,
    fontStyle: "italic",
    color: THEME.gray[100],
    fontFamily: FONT.regular,
  },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
});
