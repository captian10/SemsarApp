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
import { broadcastNewListing } from "@lib/notifications"; // ✅ NEW
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
  Linking,
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
import { useAppTheme } from "@providers/AppThemeProvider";

import Button from "../../../components/Button";
import { defaultPropertyImage as defaultPropertyImageUrl } from "../../../components/PropertyCard";

const BUCKET = "property-images";
const MAX_IMAGE_BYTES = 7_000_000;

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

function getImagesMediaTypes(): any {
  // ✅ New API: ImagePicker.MediaType (array)
  const MT = (ImagePicker as any).MediaType;
  if (MT?.Images) return [MT.Images];

  // fallback very old
  return ["images"];
}

function isRlsError(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("row-level security") || msg.includes("rls");
}

const digitsOnly = (s: string) => String(s ?? "").replace(/\D/g, "");

// ✅ FIX: iOS can return "limited" and Android Photo Picker may not return "granted".
// So we treat (granted || limited) as ok, and on Android we allow opening the picker anyway.
async function ensurePhotoPermission(): Promise<boolean> {
  if (Platform.OS === "android") return true;

  const perm = await ImagePicker.getMediaLibraryPermissionsAsync();

  // iOS: limited = allowed
  if ((perm as any)?.granted || (perm as any)?.status === "limited")
    return true;

  if (!(perm as any)?.canAskAgain) {
    Alert.alert(
      "مطلوب إذن",
      "الإذن مرفوض من إعدادات الجهاز. افتح الإعدادات واسمح بالصور.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "فتح الإعدادات", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return (req as any)?.granted || (req as any)?.status === "limited";
}

type FormData = {
  coverImage: string | null;
  title: string;
  description: string;
  price: string;
  currency: string;
  city: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
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

  addImagesBtn: ViewStyle;
  addImagesBtnText: TextStyle;
  thumbsRow: ViewStyle;
  thumbWrap: ViewStyle;
  thumb: ImageStyle;
  thumbRemove: ViewStyle;
  thumbRemoveText: TextStyle;
  miniHint: TextStyle;

  error: TextStyle;
  delete: ViewStyle;
  deleteText: TextStyle;
  loadingText: TextStyle;

  pressed: ViewStyle;
  disabled: ViewStyle;
};

const Field = memo(function Field({
  ui,
  placeholderColor,
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
  ui: any;
  placeholderColor: string;
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
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        style={[ui.input, ui.inputRtl, multiline ? ui.inputMultiline : null]}
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
  ui,
  placeholderColor,
  value,
  onChangeText,
  currency,
  loading,
}: {
  ui: any;
  placeholderColor: string;
  value: string;
  onChangeText: (t: string) => void;
  currency: string;
  loading: boolean;
}) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>السعر</Text>

      <View style={ui.priceRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="مثال: 1500"
          placeholderTextColor={placeholderColor}
          style={[ui.input, ui.priceInput, ui.inputRtl]}
          keyboardType="decimal-pad"
          editable={!loading}
          textAlign="right"
          blurOnSubmit={false}
          autoCorrect={false}
          accessibilityLabel="السعر"
        />

        <View style={ui.currencyPill}>
          <Text style={ui.currencyText}>{String(currency || "جنيه")}</Text>
        </View>
      </View>
    </View>
  );
});

const PropertyTypeSelector = memo(function PropertyTypeSelector({
  ui,
  propertyType,
  setPropertyType,
  loading,
}: {
  ui: any;
  propertyType: PropertyType;
  setPropertyType: (t: PropertyType) => void;
  loading: boolean;
}) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>نوع العقار</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ui.chipsRow}
        keyboardShouldPersistTaps="always"
      >
        {PROPERTY_TYPES.map((t) => {
          const active = propertyType === t;
          return (
            <Pressable
              key={t}
              onPress={() => setPropertyType(t)}
              style={({ pressed }) => [
                ui.chip,
                active ? ui.chipActive : null,
                pressed ? ui.pressed : null,
                loading ? ui.disabled : null,
              ]}
              disabled={loading}
              accessibilityLabel={`نوع العقار: ${t}`}
            >
              <Text style={[ui.chipText, active ? ui.chipTextActive : null]}>
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
  ui,
  status,
  setStatus,
  loading,
}: {
  ui: any;
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
    <View style={ui.field}>
      <Text style={ui.label}>الحالة</Text>
      <View style={ui.statusRow}>
        {PROPERTY_STATUS.map((s) => {
          const active = status === s;
          const label = statusLabels[s] ?? s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={({ pressed }) => [
                ui.statusChip,
                active ? ui.statusChipActive : null,
                pressed ? ui.pressed : null,
                loading ? ui.disabled : null,
              ]}
              disabled={loading}
              accessibilityLabel={`حالة العقار: ${label}`}
            >
              <Text
                style={[ui.statusText, active ? ui.statusTextActive : null]}
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
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const ui = useMemo(
    () => createStyles(t),
    [
      t.scheme,
      t.colors.bg,
      t.colors.surface,
      t.colors.text,
      t.colors.muted,
      t.colors.border,
      t.colors.primary,
      t.colors.error,
    ]
  );

  const placeholderColor = isDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(15,23,42,0.35)";

  const router = useRouter();
  const { id: idParam } = useLocalSearchParams();

  const id = useMemo(() => {
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  }, [idParam]);

  const isUpdating = Boolean(id);

  const { mutate: insertProperty } = useInsertProperty();
  const { mutate: updateProperty } = useUpdateProperty();
  const { mutate: deleteProperty } = useDeleteProperty();
  const { data: updatingProperty } = useProperty(isUpdating ? id : "");

  const { data: contact } = usePropertyContact(isUpdating ? id : "");
  const { mutateAsync: upsertContact } = useUpsertPropertyContact();

  const [formData, dispatchForm] = useReducer(formReducer, initialFormData);

  const [showSpecs, setShowSpecs] = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [didLoadImages, setDidLoadImages] = useState(false);
  const [imagesLoadError, setImagesLoadError] = useState<string | null>(null);
  const [showExtraImages, setShowExtraImages] = useState(false);

  const contactHadRowRef = useRef(false);
  const didInitContactRef = useRef(false);

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const imageSourceForPreview: ImageSourcePropType = useMemo(() => {
    const c = formData.coverImage;
    if (!c) return DEFAULT_IMAGE_SOURCE;

    if (isLocalUri(c) || isHttpUrl(c)) return { uri: c };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(c);
    return data?.publicUrl ? { uri: data.publicUrl } : DEFAULT_IMAGE_SOURCE;
  }, [formData.coverImage]);

  const extraThumbs = useMemo(() => {
    return extraImages.map((v) => {
      const s = String(v ?? "").trim();
      if (!s) return { key: s, uri: defaultPropertyImageUrl, raw: s };
      if (isLocalUri(s) || isHttpUrl(s)) return { key: s, uri: s, raw: s };
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(s);
      return {
        key: s,
        uri: data?.publicUrl ?? defaultPropertyImageUrl,
        raw: s,
      };
    });
  }, [extraImages]);

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
      updatingProperty.bedrooms != null
        ? String(updatingProperty.bedrooms)
        : "";
    const bathrooms =
      updatingProperty.bathrooms != null
        ? String(updatingProperty.bathrooms)
        : "";
    const area =
      updatingProperty.area_sqm != null
        ? String(updatingProperty.area_sqm)
        : "";

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
      value: (PROPERTY_TYPES.find(
        (t) =>
          String(t).trim() ===
          String(updatingProperty?.property_type ?? "").trim()
      ) ??
        PROPERTY_TYPES[0] ??
        "شقة") as PropertyType,
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

  useEffect(() => {
    if (!isUpdating) return;
    if (didInitContactRef.current) return;
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

  useEffect(() => {
    if (!isUpdating) return;
    if (!id) return;
    if (didLoadImages) return;

    (async () => {
      try {
        setImagesLoadError(null);

        const { data, error } = await supabase
          .from("property_images")
          .select("id,url,sort_order")
          .eq("property_id", id)
          .order("sort_order", { ascending: true });

        if (error) throw new Error(error.message);

        const urls = (data ?? [])
          .map((r: any) => String(r.url ?? "").trim())
          .filter((x: string) => x.length > 0);

        setExtraImages(urls);
        if (urls.length) setShowExtraImages(true);
      } catch (e: any) {
        setImagesLoadError(e?.message ?? "فشل تحميل الصور الإضافية");
      } finally {
        setDidLoadImages(true);
      }
    })();
  }, [isUpdating, id, didLoadImages]);

  const resetFields = () => {
    dispatchForm({ type: "RESET" });
    setShowSpecs(false);
    setShowOwner(false);
    setShowExtraImages(false);
    setExtraImages([]);
    setDidLoadImages(false);
    setImagesLoadError(null);
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

    if (formData.ownerPhone.trim()) {
      const d = digitsOnly(formData.ownerPhone);
      if (d.length < 7) newErrors.push("رقم موبايل صاحب العقار غير صحيح");
    }

    if (!formData.propertyType) newErrors.push("اختر نوع العقار");
    if (!formData.status) newErrors.push("اختر حالة العقار");

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const pickCoverImage = async () => {
    if (loading) return;

    const ok = await ensurePhotoPermission();
    if (!ok) return;

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

  const pickExtraImages = async () => {
    if (loading) return;

    const ok = await ensurePhotoPermission();
    if (!ok) return;

    const result: any = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getImagesMediaTypes(),
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 20,
    });

    if (result.canceled) return;

    // ✅ Don’t require file:// (Android photo picker may return content://)
    const assets = (result.assets ?? []) as Array<{ uri?: string }>;
    const uris = assets
      .map((a) => String(a?.uri ?? "").trim())
      .filter((u) => u.length > 0);

    if (!uris.length) return;

    const okUris: string[] = [];
    for (const uri of uris) {
      try {
        const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
        const size = (info as any)?.size as number | undefined;
        if (typeof size === "number" && size > MAX_IMAGE_BYTES) continue;
        okUris.push(uri);
      } catch {
        okUris.push(uri);
      }
    }

    if (!okUris.length) {
      Alert.alert("خطأ", "كل الصور كانت كبيرة جدًا (أكبر من 7MB).");
      return;
    }

    setImagesLoadError(null);
    setDidLoadImages(true);

    setExtraImages((prev) => {
      const set = new Set(prev);
      okUris.forEach((u) => set.add(u));
      return Array.from(set);
    });

    setShowExtraImages(true);
  };

  const removeExtraImage = (uriOrPath: string) => {
    setImagesLoadError(null);
    setDidLoadImages(true);
    setExtraImages((prev) => prev.filter((x) => x !== uriOrPath));
  };

  const uploadImage = async (localUri: string) => {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const ext = getExt(localUri);
    const filePath = `${randomUUID()}.${ext}`;
    const contentType = getContentType(ext);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, decode(base64), {
        contentType,
        upsert: false,
      });

    if (error) {
      if (isRlsError(error)) throw new Error("RLS منع رفع الصورة في Storage.");
      throw new Error(error.message);
    }

    return data?.path ?? null;
  };

  const uploadManyImages = async (urisOrPaths: string[]) => {
    const paths: string[] = [];

    for (const v of urisOrPaths) {
      const s = String(v ?? "").trim();
      if (!s) continue;

      if (isLocalUri(s) || s.startsWith("content://")) {
        // ✅ upload both file:// and content://
        const p = await uploadImage(s);
        if (p) paths.push(p);
      } else {
        paths.push(s);
      }
    }

    return paths;
  };

  const buildPayload = async (finalCover: string | null) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    if (!uid) throw new Error("أنت غير مسجل دخول.");

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

  const syncOwnerContact = async (propertyId: string) => {
    const owner_name = formData.ownerName.trim() || null;
    const owner_phone = formData.ownerPhone.trim() || null;

    if (owner_name || owner_phone) {
      await upsertContact({ property_id: propertyId, owner_name, owner_phone });
      contactHadRowRef.current = true;
      return;
    }

    if (isUpdating && contactHadRowRef.current) {
      const { error } = await supabase
        .from("property_contacts")
        .delete()
        .eq("property_id", propertyId);
      if (error) throw new Error(error.message);
      contactHadRowRef.current = false;
    }
  };

  const syncPropertyImages = async (propertyId: string) => {
    const hasNewLocal = extraImages.some(
      (x) => isLocalUri(x) || x.startsWith("content://")
    );

    if (isUpdating && !didLoadImages && !hasNewLocal) return;
    if (isUpdating && imagesLoadError && !hasNewLocal) return;

    const finalPaths = await uploadManyImages(extraImages);

    const { error: delErr } = await supabase
      .from("property_images")
      .delete()
      .eq("property_id", propertyId);
    if (delErr) throw new Error(delErr.message);

    if (!finalPaths.length) return;

    const rows = finalPaths.map((path, idx) => ({
      property_id: propertyId,
      url: path,
      sort_order: idx,
    }));

    const { error: insErr } = await supabase
      .from("property_images")
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  };

  const onCreate = async () => {
    setErrors([]);
    if (!validateInput()) return;

    try {
      setLoading(true);

      let coverPath: string | null = null;
      if (
        (isLocalUri(formData.coverImage) ||
          String(formData.coverImage ?? "").startsWith("content://")) &&
        formData.coverImage
      ) {
        coverPath = await uploadImage(formData.coverImage);
      }

      const payload = await buildPayload(coverPath);

      insertProperty(payload as any, {
        onSuccess: async (row: any) => {
          try {
            const pid = String(row?.id);
            await syncOwnerContact(pid);
            await syncPropertyImages(pid);

            // ✅ best-effort push broadcast
            broadcastNewListing({
              kind: "property",
              id: pid,
              title: payload.title,
              city: payload.city ?? null,
            }).catch((e: any) =>
              console.log(
                "[push] broadcast property failed:",
                e?.message ?? String(e)
              )
            );

            resetFields();
            setLoading(false);
            router.back();
          } catch (e: any) {
            setLoading(false);
            setErrors([e?.message || "فشل حفظ الصور/بيانات صاحب العقار"]);
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

      if (
        (isLocalUri(formData.coverImage) ||
          String(formData.coverImage ?? "").startsWith("content://")) &&
        formData.coverImage
      ) {
        finalCover = await uploadImage(formData.coverImage);
      }

      const payload = await buildPayload(finalCover);
      delete payload.created_by;

      updateProperty({ id, ...payload } as any, {
        onSuccess: async (row: any) => {
          try {
            const pid = String(row?.id ?? id);
            await syncOwnerContact(pid);
            await syncPropertyImages(pid);

            setLoading(false);
            router.back();
          } catch (e: any) {
            setLoading(false);
            setErrors([e?.message || "فشل حفظ الصور/بيانات صاحب العقار"]);
          }
        },
        onError: (err: any) => {
          setLoading(false);
          setErrors([err?.message || "فشل تحديث العقار"]);
        },
      });
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
        style={ui.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Stack.Screen
          options={{
            title: isUpdating ? "تعديل عقار" : "إضافة عقار",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: t.colors.bg },
            headerTintColor: t.colors.text,
            headerTitleStyle: {
              color: t.colors.text,
              fontFamily: FONT.bold,
              fontSize: 18,
            },
          }}
        />

        <ScrollView
          contentContainerStyle={ui.container}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={ui.header}>
            <Text style={ui.title}>
              {isUpdating ? "تعديل بيانات العقار" : "إضافة عقار جديد"}
            </Text>
            <Text style={ui.subtitle}>
              أضف صورة الغلاف، صور إضافية، العنوان، السعر، والمواصفات الأساسية.
            </Text>
          </View>

          <View style={ui.card}>
            <Pressable
              onPress={loading ? undefined : pickCoverImage}
              style={({ pressed }) => [
                ui.imageWrap,
                pressed && !loading ? ui.pressed : null,
                loading ? ui.disabled : null,
              ]}
              accessibilityLabel="اختيار صورة الغلاف"
            >
              <Image
                source={imageSourceForPreview}
                style={ui.image}
                resizeMode="cover"
              />
              <View style={ui.imageOverlay}>
                <Text style={ui.imageOverlayText}>
                  {formData.coverImage
                    ? "تغيير صورة الغلاف"
                    : "اختيار صورة غلاف"}
                </Text>
              </View>
            </Pressable>

            <View style={ui.sectionHeaderRow}>
              <Text style={ui.sectionHint}>صور إضافية (اختياري)</Text>

              <Pressable
                onPress={() => setShowExtraImages((p) => !p)}
                style={({ pressed }) => [
                  ui.specToggle,
                  pressed && ui.pressed,
                  loading && ui.disabled,
                ]}
                disabled={loading}
              >
                <Text style={ui.specToggleText}>
                  {showExtraImages ? "إخفاء" : "إضافة"}
                </Text>
              </Pressable>
            </View>

            {showExtraImages && (
              <View style={{ gap: 10, marginBottom: 6 }}>
                <Pressable
                  onPress={loading ? undefined : pickExtraImages}
                  style={({ pressed }) => [
                    ui.addImagesBtn,
                    pressed && ui.pressed,
                    loading && ui.disabled,
                  ]}
                  disabled={loading}
                  accessibilityLabel="إضافة صور إضافية"
                >
                  <Text style={ui.addImagesBtnText}>إضافة صور</Text>
                </Pressable>

                {extraImages.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={ui.thumbsRow}
                  >
                    {extraThumbs.map((it) => (
                      <View key={it.key} style={ui.thumbWrap}>
                        <Image
                          source={{ uri: it.uri }}
                          style={ui.thumb}
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => removeExtraImage(it.raw)}
                          style={ui.thumbRemove}
                          hitSlop={10}
                          accessibilityLabel="حذف الصورة"
                        >
                          <Text style={ui.thumbRemoveText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {extraImages.length === 0 && (
                  <Text style={ui.miniHint}>
                    يمكنك إضافة 1 أو أكثر صور. لو ما أضفتش صور مش مشكلة.
                  </Text>
                )}
              </View>
            )}

            <Field
              ui={ui}
              placeholderColor={placeholderColor}
              label="عنوان العقار"
              value={formData.title}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "title", value: v })
              }
              placeholder="مثال: شقة للبيع في قنا"
              loading={loading}
            />

            <Field
              ui={ui}
              placeholderColor={placeholderColor}
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
              ui={ui}
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
              ui={ui}
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
              ui={ui}
              placeholderColor={placeholderColor}
              value={formData.price}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "price", value: v })
              }
              currency={formData.currency}
              loading={loading}
            />

            <Field
              ui={ui}
              placeholderColor={placeholderColor}
              label="المدينة (اختياري)"
              value={formData.city}
              onChangeText={(v) =>
                dispatchForm({ type: "UPDATE_FIELD", field: "city", value: v })
              }
              placeholder="مثال: قنا"
              loading={loading}
            />

            <Field
              ui={ui}
              placeholderColor={placeholderColor}
              label="العنوان (اختياري)"
              value={formData.address}
              onChangeText={(v) =>
                dispatchForm({
                  type: "UPDATE_FIELD",
                  field: "address",
                  value: v,
                })
              }
              placeholder="مثال: شارع النيل، أمام المستشفى"
              loading={loading}
            />

            <View style={ui.sectionHeaderRow}>
              <Text style={ui.sectionHint}>صاحب العقار (للأدمن فقط)</Text>

              <Pressable
                onPress={() => setShowOwner((p) => !p)}
                style={({ pressed }) => [
                  ui.specToggle,
                  pressed && ui.pressed,
                  loading && ui.disabled,
                ]}
                disabled={loading}
              >
                <Text style={ui.specToggleText}>
                  {showOwner ? "إخفاء" : "إضافة"}
                </Text>
              </Pressable>
            </View>

            {showOwner && (
              <>
                <Field
                  ui={ui}
                  placeholderColor={placeholderColor}
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
                  ui={ui}
                  placeholderColor={placeholderColor}
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

            <View style={ui.sectionHeaderRow}>
              <Text style={ui.sectionHint}>المواصفات (اختياري)</Text>

              <Pressable
                onPress={() => setShowSpecs((p) => !p)}
                style={({ pressed }) => [
                  ui.specToggle,
                  pressed && ui.pressed,
                  loading && ui.disabled,
                ]}
                disabled={loading}
              >
                <Text style={ui.specToggleText}>
                  {showSpecs ? "إخفاء" : "إضافة"}
                </Text>
              </Pressable>
            </View>

            {showSpecs && (
              <View style={ui.grid3}>
                <View style={{ flex: 1 }}>
                  <Field
                    ui={ui}
                    placeholderColor={placeholderColor}
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
                    ui={ui}
                    placeholderColor={placeholderColor}
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
                    ui={ui}
                    placeholderColor={placeholderColor}
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
                  <Text key={idx} style={ui.error}>
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
                  ui.delete,
                  pressed && !loading ? ui.pressed : null,
                  loading ? ui.disabled : null,
                ]}
                accessibilityLabel="حذف العقار"
              >
                <Text style={ui.deleteText}>حذف العقار</Text>
              </Pressable>
            )}

            {loading && <Text style={ui.loadingText}>جاري الحفظ...</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(t: any) {
  const isDark = t.scheme === "dark";

  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const subtleBorder = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.10)";

  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";

  return StyleSheet.create<Styles>({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    container: { padding: 16, paddingBottom: 40 },

    header: { paddingHorizontal: 2, marginBottom: 10 },
    title: {
      fontSize: 22,
      color: t.colors.text,
      textAlign: "right",
      fontFamily: FONT.bold,
      writingDirection: "rtl",
    },
    subtitle: {
      fontSize: 13,
      marginTop: 4,
      color: t.colors.muted,
      textAlign: "right",
      fontFamily: FONT.regular,
      writingDirection: "rtl",
    },

    card: {
      backgroundColor: t.colors.surface,
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: t.colors.border,
      shadowColor: "#000000",
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 0 : 3,
    },

    imageWrap: {
      borderRadius: 18,
      backgroundColor: t.colors.surface,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: subtleBorder,
      position: "relative",
      marginBottom: 12,
    },
    image: { width: "100%", aspectRatio: 16 / 9 },
    imageOverlay: {
      position: "absolute",
      bottom: 10,
      right: 10,
      backgroundColor: t.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    imageOverlayText: { color: "#fff", fontSize: 12, fontFamily: FONT.bold },

    field: { marginBottom: 12 },
    label: {
      fontSize: 12,
      marginBottom: 6,
      color: t.colors.text,
      textAlign: "right",
      fontFamily: FONT.medium,
      writingDirection: "rtl",
    },
    input: {
      borderWidth: 1,
      borderColor: subtleBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: inputBg,
      borderRadius: 14,
      fontSize: 15,
      color: t.colors.text,
      fontFamily: FONT.regular,
    },
    inputMultiline: { minHeight: 110, textAlignVertical: "top" as const },
    inputRtl: { writingDirection: "rtl" as const },

    chipsRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: subtleBorder,
      backgroundColor: subtleBg,
    },
    chipActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    chipText: { fontSize: 12, color: t.colors.text, fontFamily: FONT.medium },
    chipTextActive: { color: "#fff", fontFamily: FONT.bold },

    statusRow: { flexDirection: "row-reverse", gap: 10, flexWrap: "wrap" },
    statusChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: subtleBorder,
      backgroundColor: subtleBg,
      minWidth: 92,
      alignItems: "center",
    },
    statusChipActive: {
      backgroundColor: "rgba(59,130,246,0.12)",
      borderColor: "rgba(59,130,246,0.28)",
    },
    statusText: { fontSize: 12, fontFamily: FONT.bold, color: t.colors.text },
    statusTextActive: { color: t.colors.primary },

    priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    currencyPill: {
      backgroundColor: t.colors.primary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 64,
    },
    currencyText: { color: "#fff", fontFamily: FONT.bold },
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
      color: t.colors.primary,
      fontFamily: FONT.bold,
      fontSize: 13,
      writingDirection: "rtl",
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
      color: t.colors.primary,
    },

    grid3: { flexDirection: "row-reverse", gap: 10 },

    addImagesBtn: {
      alignSelf: "flex-end",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(59,130,246,0.25)",
      backgroundColor: "rgba(59,130,246,0.10)",
    },
    addImagesBtnText: {
      fontFamily: FONT.bold,
      fontSize: 12,
      color: t.colors.primary,
    },

    thumbsRow: { flexDirection: "row-reverse", gap: 10, paddingVertical: 4 },
    thumbWrap: {
      width: 86,
      height: 86,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: subtleBorder,
      backgroundColor: subtleBg,
      position: "relative",
    },
    thumb: { width: "100%", height: "100%" },
    thumbRemove: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 999,
      backgroundColor: "rgba(239,68,68,0.95)",
      alignItems: "center",
      justifyContent: "center",
    },
    thumbRemoveText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

    miniHint: {
      fontSize: 12,
      color: t.colors.muted,
      fontFamily: FONT.regular,
      textAlign: "right",
      writingDirection: "rtl",
    },

    error: {
      color: t.colors.error,
      textAlign: "right",
      marginTop: 4,
      fontFamily: FONT.medium,
      writingDirection: "rtl",
    },

    delete: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: t.colors.error,
      alignItems: "center",
    },
    deleteText: { color: "#fff", fontFamily: FONT.bold },

    loadingText: {
      textAlign: "right",
      marginTop: 10,
      fontStyle: "italic",
      color: t.colors.muted,
      fontFamily: FONT.regular,
      writingDirection: "rtl",
    },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    disabled: { opacity: 0.6 },
  });
}
