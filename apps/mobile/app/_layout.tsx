import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(guardian)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
