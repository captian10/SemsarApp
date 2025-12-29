import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // ✅ legacy API (no migration warning)
import { decode } from "base64-arraybuffer";
import { randomUUID } from "expo-crypto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
  useDeleteProduct,
  useInsertProduct,
  useProduct,
  useUpdateProduct,
} from "@api/products";
import { supabase } from "@lib/supabase";

import Button from "../../../components/Button";
import { defaultPizzaImage } from "../../../components/ProductListItem";
import Colors from "../../../constants/Colors";

const BUCKET = "product-images";

function handleError(error: any): never {
  if (error?.message) throw new Error(error.message);
  throw new Error("Something went wrong");
}

export default function CreateScreen() {
  const [image, setImage] = useState<string | null>(null); // file:// OR storage path OR url
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
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

  // ✅ Make image show correctly:
  // - local file:// => show directly
  // - http(s) url => show directly
  // - storage path (e.g. "abc.png") => convert to public URL
  const imageUriForPreview = useMemo(() => {
    if (!image) return defaultPizzaImage;

    if (image.startsWith("file://")) return image;
    if (image.startsWith("http://") || image.startsWith("https://")) return image;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(image);
    return data.publicUrl || defaultPizzaImage;
  }, [image]);

  useEffect(() => {
    if (!updatingProduct) return;

    setName(updatingProduct.name ?? "");
    setPrice(updatingProduct.price != null ? String(updatingProduct.price) : "");
    setImage(updatingProduct.image ?? null);
  }, [updatingProduct]);

  const resetFields = () => {
    setName("");
    setPrice("");
    setImage(null);
    setErrors("");
  };

  const validateInput = () => {
    setErrors("");

    if (!name.trim()) {
      setErrors("Name is required");
      return false;
    }

    if (!price.trim()) {
      setErrors("Price is required");
      return false;
    }

    const p = Number(price);
    if (!Number.isFinite(p)) {
      setErrors("Price must be a valid number");
      return false;
    }

    return true;
  };

  const pickImage = async () => {
    if (loading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // ✅ no MediaTypeOptions, no MediaType enum
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) return;

    const selected = result.assets[0];

    // fileSize may be undefined on some platforms — guard it
    if (selected.fileSize && selected.fileSize > 5_000_000) {
      Alert.alert("Error", "Image is too large. Choose an image under 5MB.");
      return;
    }

    setImage(selected.uri); // file://...
  };

  const uploadImage = async (localUri: string) => {
    // expects file://
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: "base64", // ✅ string literal
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

    return data?.path ?? null; // storage path
  };

  const onCreate = async () => {
    if (!validateInput()) return;

    try {
      setLoading(true);

      let imagePath: string | null = null;
      if (image?.startsWith("file://")) {
        imagePath = await uploadImage(image);
      }

      insertProduct(
        { name: name.trim(), price: Number(price), image: imagePath },
        {
          onSuccess: () => {
            resetFields();
            setLoading(false);
            router.back();
          },
          onError: (err: any) => {
            setLoading(false);
            setErrors(err?.message || "Failed to create product");
          },
        }
      );
    } catch (e: any) {
      setLoading(false);
      setErrors(e?.message || "Failed to upload image");
    }
  };

  const onUpdate = async () => {
    if (!validateInput()) return;

    try {
      setLoading(true);

      // Keep existing image unless user picked a new local file
      let finalImageValue: string | null = image;

      if (image?.startsWith("file://")) {
        finalImageValue = await uploadImage(image);
      }

      updateProduct(
        { id, name: name.trim(), price: Number(price), image: finalImageValue },
        {
          onSuccess: () => {
            setLoading(false);
            router.back();
          },
          onError: (err: any) => {
            setLoading(false);
            setErrors(err?.message || "Failed to update product");
          },
        }
      );
    } catch (e: any) {
      setLoading(false);
      setErrors(e?.message || "Failed to upload image");
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
        Alert.alert("Error", err?.message || "Failed to delete product");
      },
    });
  };

  const confirmDelete = () => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: isUpdating ? "Update Product" : "Create Product" }}
      />

      <Image
        source={{ uri: imageUriForPreview }}
        style={styles.image}
        resizeMode="contain"
      />

      <Text
        onPress={loading ? undefined : pickImage}
        style={[styles.textButton, loading && { opacity: 0.5 }]}
      >
        Select Image
      </Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Margarita"
        style={styles.input}
        autoCapitalize="words"
        editable={!loading}
      />

      <Text style={styles.label}>Price ($)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="9.99"
        style={styles.input}
        keyboardType="decimal-pad"
        editable={!loading}
      />

      {!!errors && <Text style={styles.error}>{errors}</Text>}

      <Button
        onPress={onSubmit}
        text={loading ? "Saving..." : isUpdating ? "Update" : "Create"}
        disabled={loading}
      />

      {isUpdating && (
        <Text
          onPress={loading ? undefined : confirmDelete}
          style={[
            styles.textButton,
            styles.deleteButton,
            loading && { opacity: 0.5 },
          ]}
        >
          Delete
        </Text>
      )}

      {loading && <Text style={styles.loadingText}>Saving...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  image: {
    width: "70%",
    aspectRatio: 1,
    alignSelf: "center",
    marginVertical: 20,
  },
  textButton: {
    alignSelf: "center",
    fontWeight: "bold",
    color: Colors.light.tint,
    marginVertical: 10,
  },
  deleteButton: {
    color: "red",
    marginTop: 20,
  },
  label: {
    color: "gray",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
    borderRadius: 8,
    fontSize: 16,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginVertical: 10,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 15,
    fontStyle: "italic",
    color: "gray",
  },
});
