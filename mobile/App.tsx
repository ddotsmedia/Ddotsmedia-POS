import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import { useAuthStore } from './src/store/auth';
import LoginScreen from './src/screens/Login';
import DashboardScreen from './src/screens/Dashboard';
import SalesScreen from './src/screens/Sales';
import InventoryScreen from './src/screens/Inventory';
import CustomersScreen from './src/screens/Customers';
import ReportsScreen from './src/screens/Reports';
import AIInsightsScreen from './src/screens/AIInsights';
import SettingsScreen from './src/screens/Settings';

const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'stats-chart',
  Sales: 'receipt',
  Inventory: 'cube',
  Customers: 'people',
  Reports: 'bar-chart',
  'AI Insights': 'sparkles',
  Settings: 'settings',
};

function MainTabs() {
  const { user } = useAuthStore();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const name = ICONS[route.name];
          return <Ionicons name={focused ? name : (`${name}-outline` as any)} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Sales" component={SalesScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      {isAdmin && <Tab.Screen name="AI Insights" component={AIInsightsScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppNavigator />
    </QueryClientProvider>
  );
}
