export function galleryImageHref(imageId: string): string {
  return `/gallery?imageId=${encodeURIComponent(imageId)}`;
}
