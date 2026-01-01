import React, { ComponentProps, useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import { supabase } from "../lib/supabase";

type RemoteImageProps = {
  path?: string | null;
  fallback: string;
  bucket?: string;     // default: product-images
  expiresIn?: number;  // default: 1 hour
} & Omit<ComponentProps<typeof Image>, "source">;

export default function RemoteImage({
  path,
  fallback,
  bucket = "product-images",
  expiresIn = 60 * 60,
  ...imageProps
}: RemoteImageProps) {
  const [uri, setUri] = useState<string>(fallback);

  const isFullUrl = useMemo(
    () => !!path && (path.startsWith("http://") || path.startsWith("https://")),
    [path]
  );

  const isLocal = useMemo(() => !!path && path.startsWith("file://"), [path]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      // لو مفيش path → fallback
      if (!path) {
        if (mounted) setUri(fallback);
        return;
      }

      // لو path هو url كامل أو local file
      if (isFullUrl || isLocal) {
        if (mounted) setUri(path);
        return;
      }

      // 1) جرّب public url (لو bucket public)
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl;
      if (publicUrl) {
        if (mounted) setUri(publicUrl);
        return;
      }

      // 2) جرّب signed url (لو bucket private)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (!mounted) return;

      if (error || !data?.signedUrl) {
        console.log("RemoteImage failed:", error?.message, "path:", path);
        setUri(fallback);
        return;
      }

      setUri(data.signedUrl);
    }

    run();
    return () => {
      mounted = false;
    };
  }, [path, fallback, bucket, expiresIn, isFullUrl, isLocal]);

  return <Image source={{ uri }} {...imageProps} />;
}
