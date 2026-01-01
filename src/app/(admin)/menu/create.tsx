import {
  useDeleteProduct,
  useInsertProduct,
  useProduct,
  useUpdateProduct,
} from "@api/products";
import { THEME } from "@constants/Colors";
import { supabase } from "@lib/supabase";
import { decode } from "base64-arraybuffer";
import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { memo, useEffect, useMemo, useState } from "react";
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
import { defaultPizzaImage as defaultPizzaImageUrl } from "../../../components/ProductListItem";

const BUCKET = "product-images";

const DEFAULT_IMAGE_SOURCE: ImageSourcePropType = {
  uri: defaultPizzaImageUrl,
};

// ✅ categories
const CATEGORIES = [
  "بيتزا",
  "كريب",
  "سندوتشات",
  "وجبات",
  "وجبات أخرى",
  "مكرونة",
] as const;

type Category = (typeof CATEGORIES)[number];
const IS_PIZZA_CATEGORY = (c: Category) => c === "بيتزا";

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const toNumOrNull = (v: string) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
};

function handleError(error: any): never {
  if (error?.message) throw new Error(error.message);
  throw new Error("Something went wrong");
}

const PriceInput = memo(function PriceInput({
  label,
  value,
  onChangeText,
  placeholder,
  loading,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  loading: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.priceRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.gray[100]}
          style={[styles.input, styles.priceInput, styles.inputRtl]}
          keyboardType="decimal-pad"
          editable={!loading}
          textAlign="right"
          blurOnSubmit={false}
          autoCorrect={false}
        />

        <View style={styles.currencyPill}>
          <Text style={styles.currencyText}>جنيه</Text>
        </View>
      </View>
    </View>
  );
});

export default function CreateScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");

  // ✅ base price (non-pizza)
  const [price, setPrice] = useState("");

  // ✅ pizza sizes
  const [priceS, setPriceS] = useState("");
  const [priceM, setPriceM] = useState("");
  const [priceL, setPriceL] = useState("");
  const [priceXL, setPriceXL] = useState("");

  const [category, setCategory] = useState<Category>("وجبات أخرى");

  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);

  const { id: idString } = useLocalSearchParams();
  const id = idString
    ? Number(Array.isArray(idString) ? idString[0] : idString)
    : NaN;
  const isUpdating = Number.isFinite(id);

  const router = useRouter();

  const { mutate: insertProduct } = useInsertProduct();
  const { mutate: updateProduct } = useUpdateProduct();
  const { data: updatingProduct } = useProduct(isUpdating ? id : NaN);
  const { mutate: deleteProduct } = useDeleteProduct();

  const isPizza = IS_PIZZA_CATEGORY(category);

  const imageSourceForPreview: ImageSourcePropType = useMemo(() => {
    if (!image) return DEFAULT_IMAGE_SOURCE;

    if (image.startsWith("file://")) return { uri: image };
    if (image.startsWith("http://") || image.startsWith("https://"))
      return { uri: image };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(image);
    return data?.publicUrl ? { uri: data.publicUrl } : DEFAULT_IMAGE_SOURCE;
  }, [image]);

  useEffect(() => {
    if (!updatingProduct) return;

    setName(updatingProduct.name ?? "");
    setImage(updatingProduct.image ?? null);

    const dbCat =
      (updatingProduct as { category?: string | null })?.category ?? null;
    const safeCat = CATEGORIES.includes(dbCat as any)
      ? (dbCat as Category)
      : "وجبات أخرى";
    setCategory(safeCat);

    // ✅ base price
    setPrice(updatingProduct.price != null ? String(updatingProduct.price) : "");

    // ✅ pizza prices
    const p: any = updatingProduct;
    setPriceS(p?.price_s != null ? String(p.price_s) : "");
    setPriceM(p?.price_m != null ? String(p.price_m) : "");
    setPriceL(p?.price_l != null ? String(p.price_l) : "");
    setPriceXL(p?.price_xl != null ? String(p.price_xl) : "");
  }, [updatingProduct]);

  // ✅ when switching category to pizza: seed M from base price (once)
  useEffect(() => {
    if (!isPizza) return;
    if (!priceM.trim() && price.trim()) setPriceM(price.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPizza]);

  const resetFields = () => {
    setName("");
    setPrice("");
    setPriceS("");
    setPriceM("");
    setPriceL("");
    setPriceXL("");
    setImage(null);
    setCategory("وجبات أخرى");
    setErrors("");
  };

  const validateInput = () => {
    setErrors("");

    if (!name.trim()) return setErrors("اسم المنتج مطلوب"), false;

    if (isPizza) {
      const s = toNumOrNull(priceS);
      const m = toNumOrNull(priceM);
      const l = toNumOrNull(priceL);
      const xl = toNumOrNull(priceXL);

      if (m == null) return setErrors("سعر حجم M مطلوب للبيتزا"), false;
      if (priceS.trim() && s == null) return setErrors("سعر حجم S غير صحيح"), false;
      if (priceL.trim() && l == null) return setErrors("سعر حجم L غير صحيح"), false;
      if (priceXL.trim() && xl == null) return setErrors("سعر حجم XL غير صحيح"), false;
    } else {
      if (!price.trim()) return setErrors("السعر مطلوب"), false;
      const p = toNumOrNull(price);
      if (p == null) return setErrors("السعر يجب أن يكون رقمًا صحيحًا"), false;
    }

    if (!category) return setErrors("اختر القسم (Category)"), false;

    return true;
  };

  const pickImage = async () => {
    if (loading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("مطلوب إذن", "من فضلك اسمح بالوصول للصور.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) return;

    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > 5_000_000) {
      Alert.alert("خطأ", "الصورة كبيرة جدًا. اختر صورة أقل من 5MB.");
      return;
    }

    setImage(selected.uri);
  };

  const uploadImage = async (localUri: string) => {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: "base64",
    });

    const fileExt = localUri.split(".").pop()?.toLowerCase();
    const filePath = `${randomUUID()}.${fileExt || "png"}`;

    const contentType =
      fileExt === "jpg" || fileExt === "jpeg"
        ? "image/jpeg"
        : fileExt === "webp"
        ? "image/webp"
        : "image/png";

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, decode(base64), { contentType });

    if (error) handleError(error);

    return data?.path ?? null;
  };

  const buildPayload = (finalImage: string | null) => {
    const common: any = {
      name: name.trim(),
      image: finalImage,
      category,
    };

    if (isPizza) {
      const s = toNumOrNull(priceS);
      const m = toNumOrNull(priceM);
      const l = toNumOrNull(priceL);
      const xl = toNumOrNull(priceXL);

      common.price_s = s != null ? round2(s) : null;
      common.price_m = m != null ? round2(m) : null;
      common.price_l = l != null ? round2(l) : null;
      common.price_xl = xl != null ? round2(xl) : null;

      // ✅ keep base price = M
      common.price = round2(m ?? 0);
    } else {
      const p = toNumOrNull(price) ?? 0;
      common.price = round2(p);

      // clear pizza columns
      common.price_s = null;
      common.price_m = null;
      common.price_l = null;
      common.price_xl = null;
    }

    return common;
  };

  const onCreate = async () => {
    if (!validateInput()) return;

    try {
      setLoading(true);

      let imagePath: string | null = null;
      if (image?.startsWith("file://")) imagePath = await uploadImage(image);

      const payload = buildPayload(imagePath);

      insertProduct(payload as any, {
        onSuccess: () => {
          resetFields();
          setLoading(false);
          router.back();
        },
        onError: (err: any) => {
          setLoading(false);
          setErrors(err?.message || "فشل إنشاء المنتج");
        },
      });
    } catch (e: any) {
      setLoading(false);
      setErrors(e?.message || "فشل رفع الصورة");
    }
  };

  const onUpdate = async () => {
    if (!validateInput()) return;

    try {
      setLoading(true);

      let finalImageValue: string | null = image;
      if (image?.startsWith("file://")) finalImageValue = await uploadImage(image);

      const payload = buildPayload(finalImageValue);

      updateProduct({ id, ...payload } as any, {
        onSuccess: () => {
          setLoading(false);
          router.back();
        },
        onError: (err: any) => {
          setLoading(false);
          setErrors(err?.message || "فشل تحديث المنتج");
        },
      });
    } catch (e: any) {
      setLoading(false);
      setErrors(e?.message || "فشل رفع الصورة");
    }
  };

  const onSubmit = () => {
    if (isUpdating) onUpdate();
    else onCreate();
  };

  const onDelete = () => {
    if (!isUpdating || loading) return;

    setLoading(true);
    deleteProduct(id, {
      onSuccess: () => {
        setLoading(false);
        router.replace("/(admin)");
      },
      onError: (err: any) => {
        setLoading(false);
        Alert.alert("خطأ", err?.message || "فشل حذف المنتج");
      },
    });
  };

  const confirmDelete = () => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد أنك تريد حذف هذا المنتج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: onDelete },
    ]);
  };

  const CategoryChips = () => (
    <View style={styles.field}>
      <Text style={styles.label}>القسم (Category)</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="always"
      >
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : null,
                pressed ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
              disabled={loading}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {c}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Stack.Screen
          options={{
            title: isUpdating ? "تعديل المنتج" : "إضافة منتج",
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
              {isUpdating ? "تعديل المنتج" : "إضافة منتج جديد"}
            </Text>
            <Text style={styles.subtitle}>أضف صورة، اسم المنتج، والسعر.</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              onPress={loading ? undefined : pickImage}
              style={({ pressed }) => [
                styles.imageWrap,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              <Image
                source={imageSourceForPreview}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>
                  {image ? "تغيير الصورة" : "اختيار صورة"}
                </Text>
              </View>
            </Pressable>

            <View style={styles.field}>
              <Text style={styles.label}>اسم المنتج</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="مثال: بيتزا مارغريتا"
                placeholderTextColor={THEME.gray[100]}
                style={[styles.input, styles.inputRtl]}
                editable={!loading}
                textAlign="right"
                blurOnSubmit={false}
                autoCorrect={false}
              />
            </View>

            <CategoryChips />

            {/* ✅ PRICES */}
            {isPizza ? (
              <>
                <Text style={styles.sectionHint}>أسعار أحجام البيتزا</Text>

                <View style={styles.sizeGrid}>
                  <PriceInput
                    label="S"
                    value={priceS}
                    onChangeText={setPriceS}
                    placeholder="مثال: 80"
                    loading={loading}
                  />

                  <PriceInput
                    label="M (الأساسي)"
                    value={priceM}
                    onChangeText={setPriceM}
                    placeholder="مثال: 100"
                    loading={loading}
                  />

                  <PriceInput
                    label="L"
                    value={priceL}
                    onChangeText={setPriceL}
                    placeholder="مثال: 120"
                    loading={loading}
                  />

                  <PriceInput
                    label="XL"
                    value={priceXL}
                    onChangeText={setPriceXL}
                    placeholder="مثال: 140"
                    loading={loading}
                  />
                </View>
              </>
            ) : (
              <PriceInput
                label="السعر"
                value={price}
                onChangeText={setPrice}
                placeholder="9.99"
                loading={loading}
              />
            )}

            {!!errors && <Text style={styles.error}>{errors}</Text>}

            <Button
              onPress={onSubmit}
              text={loading ? "جاري الحفظ..." : isUpdating ? "تحديث المنتج" : "إضافة المنتج"}
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
              >
                <Text style={styles.deleteText}>حذف المنتج</Text>
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
  priceRow: ViewStyle;
  currencyPill: ViewStyle;
  currencyText: TextStyle;
  priceInput: any;

  chipsRow: ViewStyle;
  chip: ViewStyle;
  chipActive: ViewStyle;
  chipText: TextStyle;
  chipTextActive: TextStyle;

  sectionHint: TextStyle;
  sizeGrid: ViewStyle;

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
  image: { width: "100%", aspectRatio: 1.6 },
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

  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  currencyPill: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  currencyText: { color: THEME.white.DEFAULT, fontFamily: FONT.bold },
  priceInput: { flex: 1 },

  sectionHint: {
    marginTop: 4,
    marginBottom: 10,
    textAlign: "right",
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 13,
  },

  sizeGrid: {
    gap: 0,
  },

  error: {
    color: THEME.error,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 10,
    fontFamily: FONT.medium,
  },

  delete: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#F6B5B5",
    backgroundColor: "#FDECEC",
    alignItems: "center",
  },
  deleteText: { color: THEME.error, fontFamily: FONT.bold },

  loadingText: {
    textAlign: "right",
    marginTop: 10,
    fontStyle: "italic",
    color: THEME.gray[100],
    fontFamily: FONT.regular,
  },

  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
});
