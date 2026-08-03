export function visibleImageFilterFor(userId: string) {
  return {
    OR: [
      { visibility: "PUBLIC" as const },
      { uploadedById: userId },
    ],
  };
}
