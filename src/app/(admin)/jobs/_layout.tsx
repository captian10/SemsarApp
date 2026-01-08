import { Stack } from "expo-router";
import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

export default function AdminJobsStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: THEME.white[100] },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: FONT.bold,
          color: THEME.dark[100],
          fontSize: 18,
        },
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: THEME.white[100] },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "إدارة الوظائف",
        }}
      />

      <Stack.Screen
        name="create"
        options={{
          title: "إضافة وظيفة",
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: "تفاصيل الوظيفة",
        }}
      />
    </Stack>
  );
}
