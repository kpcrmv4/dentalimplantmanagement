'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PushSubscriptionState {
  permission: NotificationPermission | 'unsupported';
  subscription: PushSubscription | null;
  isLoading: boolean;
  error: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null) {
  const [state, setState] = useState<PushSubscriptionState>({
    permission: 'unsupported',
    subscription: null,
    isLoading: false,
    error: null,
  });

  // Check if push notifications are supported
  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  // Initialize state
  useEffect(() => {
    if (!isSupported) {
      setState(prev => ({ ...prev, permission: 'unsupported' }));
      return;
    }

    setState(prev => ({ ...prev, permission: Notification.permission }));

    // Check for existing subscription
    navigator.serviceWorker.ready.then(async (registration) => {
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        setState(prev => ({ ...prev, subscription: existingSub }));
      }
    }).catch(console.error);
  }, [isSupported]);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied'
        }));
        return false;
      }

      // Get VAPID public key from API
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      // Send VAPID key to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_VAPID_KEY',
          key: publicKey,
        });
      }

      // Save subscription to database via API
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        subscription,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, [isSupported, userId]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return false;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Unsubscribe from push manager
      await state.subscription.unsubscribe();

      // Remove from database via API
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
        }),
      });

      setState(prev => ({
        ...prev,
        subscription: null,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, [state.subscription]);

  // Send a test notification
  const sendTestNotification = useCallback(async () => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'ทดสอบการแจ้งเตือน',
          body: 'Push notification ทำงานปกติ!',
          url: '/notifications',
          data: { type: 'test' },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      return false;
    }
  }, [userId]);

  return {
    ...state,
    isSupported,
    isSubscribed: !!state.subscription,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Hook to check push notification status
export function usePushPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);

    // Listen for permission changes (some browsers support this)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            setPermission(Notification.permission);
          };
        })
        .catch(() => {
          // Ignore if permissions API not supported
        });
    }
  }, []);

  return permission;
}
