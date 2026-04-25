import type { Photo } from "@/lib/photos";

type Props = {
  photo: Photo;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  expanded?: boolean;
};

export function cameraMetadataItems(photo: Photo, expanded = false) {
  const exposure = [
    { label: "Aperture", value: photo.aperture || "—" },
    { label: "Shutter", value: photo.shutterSpeed || "—" },
    { label: "ISO", value: photo.iso || "—" },
  ];

  if (!expanded) return exposure;

  return [
    ...exposure,
    { label: "Camera", value: photo.camera || "—" },
    { label: "Lens", value: photo.lens || "—" },
    { label: "Focal", value: photo.focalLength || "—" },
  ];
}

export default function CameraMetadata({
  photo,
  className = "",
  labelClassName = "text-[9px]",
  valueClassName = "text-[11px]",
  expanded = false,
}: Props) {
  return (
    <dl className={className}>
      {cameraMetadataItems(photo, expanded).map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className={`uppercase tracking-[0.24em] text-[#efe7dc]/40 ${labelClassName}`}>
            {item.label}
          </dt>
          <dd
            className={`mt-1 font-mono leading-tight text-[#efe7dc]/90 ${valueClassName}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
