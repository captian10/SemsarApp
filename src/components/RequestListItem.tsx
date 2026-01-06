import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Link, useSegments } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

dayjs.extend(relativeTime);

type StatusKey = "new" | "answered" | "closed" | "unknown";

const normalize = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

const toStatusKey = (s: unknown): StatusKey => {
  const v = normalize(s);

  if (v === "new") return "new";
  if (v === "answered" || v === "in_progress" || v === "inprogress")
    return "answered";
  if (v === "closed" || v === "done" || v === "completed") return "closed";

  return "unknown";
};

const STATUS_META: Record<
  StatusKey,
  {
    label: string;
    icon: React.ComponentProps<typeof FontAwesome>["name"];
    pillBg: string;
    pillBorder: string;
    pillText: string;
    accent: string;
  }
> = {
  new: {
    label: "جديد",
    icon: "bolt",
    pillBg: "rgba(59,130,246,0.10)",
    pillBorder: "rgba(59,130,246,0.22)",
    pillText: THEME.primary,
    accent: THEME.primary,
  },
  answered: {
    label: "تم الرد",
    icon: "comment",
    pillBg: "rgba(245,158,11,0.12)",
    pillBorder: "rgba(245,158,11,0.25)",
    pillText: "rgba(180,83,9,1)",
    accent: "rgba(245,158,11,1)",
  },
  closed: {
    label: "مغلق",
    icon: "check",
    pillBg: "rgba(34,197,94,0.12)",
    pillBorder: "rgba(34,197,94,0.22)",
    pillText: "rgba(22,101,52,1)",
    accent: "rgba(34,197,94,1)",
  },
  unknown: {
    label: "غير معروف",
    icon: "question",
    pillBg: "rgba(15,23,42,0.06)",
    pillBorder: "rgba(15,23,42,0.10)",
    pillText: "rgba(15,23,42,0.60)",
    accent: "rgba(15,23,42,0.25)",
  },
};

// ✅ minimal shape that matches public.requests
type RequestRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  message?: string | null;
  phone?: string | null;

  property_id?: string | null;
  user_id?: string | null;

  property?: { title?: string | null; city?: string | null } | null;
};

type Props = {
  request: RequestRow | null | undefined;
};

export default function RequestListItem({ request }: Props) {
  if (!request) return null;

  const segments = useSegments();

  const createdAt = request.created_at ?? null;

  const timeText = useMemo(() => {
    if (!createdAt) return "";
    try {
      return dayjs(createdAt).fromNow();
    } catch {
      return "";
    }
  }, [createdAt]);

  const statusKey = useMemo(() => toStatusKey(request.status), [request.status]);
  const status = STATUS_META[statusKey];

  const href = useMemo(() => {
    const isAdmin = (segments as string[]).includes("(admin)");
    const id = String(request.id);
    return isAdmin
      ? ({ pathname: "/(admin)/requests/[id]", params: { id } } as const)
      : ({ pathname: "/(user)/requests/[id]", params: { id } } as const);
  }, [segments, request.id]);

  const phone = request.phone?.trim() || "—";
  const message = request.message?.trim() || "بدون رسالة";

  const propertyTitle = request.property?.title?.trim();
  const propertyCity = request.property?.city?.trim();
  const propertyLine =
    propertyTitle || propertyCity
      ? `${propertyTitle ?? "عقار"}${propertyCity ? ` • ${propertyCity}` : ""}`
      : null;

  return (
    <View style={styles.wrap}>
      <Link href={href} asChild>
        <Pressable
          android_ripple={{ color: "rgba(15,23,42,0.06)" }}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={[styles.accent, { backgroundColor: status.accent }]} />

          <View style={styles.content}>
            {/* Top */}
            <View style={styles.topRow}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  طلب #{String(request.id).slice(0, 8)}
                </Text>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: status.pillBg, borderColor: status.pillBorder },
                  ]}
                >
                  <FontAwesome name={status.icon} size={12} color={status.pillText} />
                  <Text style={[styles.statusText, { color: status.pillText }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              {!!timeText && (
                <Text style={styles.timeText} numberOfLines={1}>
                  {timeText}
                </Text>
              )}
            </View>

            {/* Property line (optional) */}
            {propertyLine ? (
              <View style={styles.subRow}>
                <FontAwesome name="home" size={12} color="rgba(15,23,42,0.55)" />
                <Text numberOfLines={1} style={styles.subText}>
                  {propertyLine}
                </Text>
              </View>
            ) : null}

            {/* Message */}
            <View style={styles.msgBox}>
              <FontAwesome name="commenting-o" size={13} color="rgba(15,23,42,0.55)" />
              <Text style={styles.msgText} numberOfLines={2}>
                {message}
              </Text>
            </View>

            {/* Bottom */}
            <View style={styles.bottomRow}>
              <View style={styles.phonePill}>
                <FontAwesome name="phone" size={12} color="rgba(15,23,42,0.55)" />
                <Text style={styles.phoneText} numberOfLines={1}>
                  {phone}
                </Text>
              </View>

              <View style={styles.openRow}>
                <Text style={styles.openText}>عرض التفاصيل</Text>
                <FontAwesome name="chevron-left" size={12} color="rgba(15,23,42,0.35)" />
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

type Styles = {
  wrap: ViewStyle;
  card: ViewStyle;
  pressed: ViewStyle;

  accent: ViewStyle;
  content: ViewStyle;

  topRow: ViewStyle;
  titleRow: ViewStyle;

  title: TextStyle;

  statusPill: ViewStyle;
  statusText: TextStyle;

  timeText: TextStyle;

  subRow: ViewStyle;
  subText: TextStyle;

  msgBox: ViewStyle;
  msgText: TextStyle;

  bottomRow: ViewStyle;

  phonePill: ViewStyle;
  phoneText: TextStyle;

  openRow: ViewStyle;
  openText: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  wrap: {
    paddingHorizontal: 10,
    marginVertical: 6,
  },

  card: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    overflow: "hidden",
    minHeight: 118,

    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },

  accent: {
    width: 4,
  },

  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    alignItems: "flex-end",
  },

  topRow: {
    width: "100%",
    gap: 6,
  },

  titleRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  timeText: {
    width: "100%",
    fontSize: 11,
    fontFamily: FONT.medium,
    color: "rgba(15,23,42,0.55)",
    textAlign: "right",
  },

  subRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  subText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
  },

  msgBox: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(15,23,42,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  msgText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.dark[100],
    textAlign: "right",
    lineHeight: 18,
  },

  bottomRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  phonePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(15,23,42,0.03)",
    maxWidth: "60%",
  },
  phoneText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  openRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  openText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: "rgba(15,23,42,0.55)",
    textAlign: "right",
  },
});
