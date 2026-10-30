import slugify from "slugify";

export function makeSlug(title: string, suffix?: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true });
  return suffix ? `${base}-${suffix}` : base;
}
