import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported");
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const { data: keyData, error: keyError } = await supabase.functions.invoke("manage-push", {
        body: { action: "get-public-key" },
      });

      if (keyError || !keyData?.publicKey) {
        console.error("Failed to get VAPID key:", keyError);
        setIsLoading(false);
        return false;
      }

      // Convert base64url to Uint8Array
      const publicKey = keyData.publicKey;
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      // Register service worker and subscribe
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      const subJson = subscription.toJSON();
      const { data: session } = await supabase.auth.getSession();
      
      const { error: subError } = await supabase.functions.invoke("manage-push", {
        body: {
          action: "subscribe",
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
        },
      });

      if (subError) {
        console.error("Failed to save subscription:", subError);
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe };
}
