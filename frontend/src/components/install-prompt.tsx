"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || (!isIos && !installEvent)) {
    return null;
  }

  async function install() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
      <p className="text-xs font-semibold text-indigo-900">Install ImageVault</p>
      {isIos ? (
        <p className="mt-1 text-xs leading-5 text-indigo-700">Use Safari’s Share menu, then choose “Add to Home Screen”.</p>
      ) : (
        <button type="button" onClick={() => void install()} className="mt-2 text-xs font-bold text-indigo-700 underline underline-offset-2">
          Install this app
        </button>
      )}
    </div>
  );
}
