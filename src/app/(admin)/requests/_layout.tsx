import { Stack } from "expo-router";

export default function HomeStack() {
  return (
    <Stack>
      <Stack.Screen name="list" options={{ headerShown: false}} />
    </Stack>
  );
}
