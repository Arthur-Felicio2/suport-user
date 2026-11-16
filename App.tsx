import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import NewCallScreen from './src/screens/NewCallScreen';
import CallListScreen from './src/screens/CallListScreen';
import CallDetailScreen from './src/screens/CallDetailScreen';
import {
  extractChamadoIdFromResponse,
  setupAndroidNotificationChannel,
} from './src/services/notificationService';

const Stack = createNativeStackNavigator();

// Referência de navegação usável fora de componentes React
export const navigationRef = createNavigationContainerRef<any>();

// Define como o app se comporta ao receber notificação em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const handledResponseIdRef = useRef<string | null>(null);

  const navigateFromNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;

      const notificationId = response.notification?.request?.identifier ?? null;
      if (notificationId && handledResponseIdRef.current === notificationId) {
        return;
      }

      const chamadoId = extractChamadoIdFromResponse(response);
      if (chamadoId && navigationRef.isReady()) {
        if (notificationId) {
          handledResponseIdRef.current = notificationId;
        }
        navigationRef.navigate('CallDetail', { chamadoId });
      }
    },
    []
  );

  const handleInitialNotificationResponse = useCallback(() => {
    if (Platform.OS === 'web') return;
    try {
      const response = Notifications.getLastNotificationResponse();
      navigateFromNotificationResponse(response);
    } catch (error) {
      console.log('Não foi possível obter última resposta de notificação:', error);
    }
  }, [navigateFromNotificationResponse]);

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationResponse(response);
    });

    handleInitialNotificationResponse();

    return () => subscription.remove();
  }, [handleInitialNotificationResponse, navigateFromNotificationResponse]);

  return (
    <NavigationContainer ref={navigationRef} onReady={handleInitialNotificationResponse}>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="CallList">
        <Stack.Screen 
          name="CallList" 
          component={CallListScreen} 
          options={{ title: 'Chamados' }} 
        />
        <Stack.Screen 
          name="NewCall" 
          component={NewCallScreen} 
          options={{ title: 'Novo Chamado' }} 
        />
        <Stack.Screen 
          name="CallDetail" 
          component={CallDetailScreen} 
          options={{ title: 'Detalhes do Chamado' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}