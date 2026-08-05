import { galleryImageHref } from "@/lib/image-links";

describe("authenticated image links", () => {
  it("links notifications to the application gallery without exposing storage URLs", () => {
    expect(galleryImageHref("image/id with spaces")).toBe("/gallery?imageId=image%2Fid%20with%20spaces");
  });
});
