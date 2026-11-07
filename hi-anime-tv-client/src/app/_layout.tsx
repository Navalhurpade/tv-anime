import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#08090D' },
          animation: 'fade',
        }}
      />
    </>
  );
}
