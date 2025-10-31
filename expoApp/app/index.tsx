import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

export default function AppIndex() {
  // For now, always send to role gate; later can check token
  return <Redirect href="/role" />;
}


