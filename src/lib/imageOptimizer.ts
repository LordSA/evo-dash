export async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  if (file.type === "image/webp") {
    return file;
  }

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
          const convertedFile = new File([blob], `${cleanName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          resolve(convertedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
