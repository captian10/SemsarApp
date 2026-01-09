import React, {
  ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image } from "react-native";
import { supabase } from "../lib/supabase";

type RemoteImageProps = {
  path?: string | null;
  fallback: string;
  bucket?: string;
} & Omit<ComponentProps<typeof Image>, "source">;

const isHttpUrl = (v: string) =>
  v.startsWith("http://") || v.startsWith("https://");
const isLocalFile = (v: string) => v.startsWith("file://");

export default function RemoteImage({
  path,
  fallback,
  bucket = "property-images",
  onError,
  ...imageProps
}: RemoteImageProps) {
  const [uri, setUri] = useState<string>(fallback);
  const reqIdRef = useRef(0);

  const normalizedPath = useMemo(() => String(path ?? "").trim(), [path]);
  const fullUrl = useMemo(
    () => (normalizedPath ? isHttpUrl(normalizedPath) : false),
    [normalizedPath]
  );
  const localFile = useMemo(
    () => (normalizedPath ? isLocalFile(normalizedPath) : false),
    [normalizedPath]
  );

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    let mounted = true;

    const safeSetUri = (next: string) => {
      if (!mounted) return;
      if (reqId !== reqIdRef.current) return;
      setUri(next);
    };

    if (!normalizedPath) {
      safeSetUri(fallback);
      return () => {
        mounted = false;
      };
    }

    if (fullUrl || localFile) {
      safeSetUri(normalizedPath);
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
    safeSetUri(data?.publicUrl || fallback);

    return () => {
      mounted = false;
    };
  }, [bucket, fallback, fullUrl, localFile, normalizedPath]);

  return (
    <Image
      source={{ uri }}
      {...imageProps}
      onError={(e) => {
        setUri(fallback);
        onError?.(e);
      }}
    />
  );
}
