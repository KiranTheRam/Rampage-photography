export type CameraMetadata = {
  aperture: string;
  shutterSpeed: string;
  iso: string;
  camera: string;
  lens: string;
  focalLength: string;
};

const EMPTY_CAMERA_METADATA: CameraMetadata = {
  aperture: "",
  shutterSpeed: "",
  iso: "",
  camera: "",
  lens: "",
  focalLength: "",
};

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  9: 4, // SLONG
  10: 8, // SRATIONAL
};

type TiffEntry = {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
};

function trimNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function formatAperture(value: number): string {
  return Number.isFinite(value) && value > 0 ? `f/${trimNumber(value)}` : "";
}

function formatShutterSpeed(num: number, den: number): string {
  if (!num || !den) return "";
  if (num >= den) {
    return `${trimNumber(num / den)}s`;
  }
  const divisor = gcd(num, den);
  return `${num / divisor}/${den / divisor}`;
}

function formatFocalLength(value: number): string {
  return Number.isFinite(value) && value > 0 ? `${trimNumber(value)}mm` : "";
}

function readEntries(
  exif: Buffer,
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
): TiffEntry[] {
  const absolute = tiffStart + ifdOffset;
  if (absolute < tiffStart || absolute + 2 > exif.length) return [];

  const count = view.getUint16(absolute, littleEndian);
  const entries: TiffEntry[] = [];
  for (let i = 0; i < count; i++) {
    const base = absolute + 2 + i * 12;
    if (base + 12 > exif.length) break;

    const tag = view.getUint16(base, littleEndian);
    const type = view.getUint16(base + 2, littleEndian);
    const valueCount = view.getUint32(base + 4, littleEndian);
    const byteCount = (TYPE_SIZES[type] ?? 0) * valueCount;
    if (!byteCount) continue;

    const valueOffset =
      byteCount <= 4
        ? base + 8
        : tiffStart + view.getUint32(base + 8, littleEndian);

    if (valueOffset >= tiffStart && valueOffset + byteCount <= exif.length) {
      entries.push({ tag, type, count: valueCount, valueOffset });
    }
  }
  return entries;
}

function readInteger(
  entry: TiffEntry | undefined,
  view: DataView,
  littleEndian: boolean,
): number | null {
  if (!entry || entry.count < 1) return null;
  if (entry.type === 3) return view.getUint16(entry.valueOffset, littleEndian);
  if (entry.type === 4) return view.getUint32(entry.valueOffset, littleEndian);
  return null;
}

function readAscii(entry: TiffEntry | undefined, exif: Buffer): string {
  if (!entry || entry.type !== 2 || entry.count < 1) return "";
  return exif
    .subarray(entry.valueOffset, entry.valueOffset + entry.count)
    .toString("utf8")
    .replace(/\0+$/g, "")
    .trim();
}

function readRational(
  entry: TiffEntry | undefined,
  view: DataView,
  littleEndian: boolean,
): { num: number; den: number; value: number } | null {
  if (!entry || entry.count < 1 || (entry.type !== 5 && entry.type !== 10)) {
    return null;
  }
  const signed = entry.type === 10;
  const num = signed
    ? view.getInt32(entry.valueOffset, littleEndian)
    : view.getUint32(entry.valueOffset, littleEndian);
  const den = signed
    ? view.getInt32(entry.valueOffset + 4, littleEndian)
    : view.getUint32(entry.valueOffset + 4, littleEndian);
  if (!den) return null;
  return { num, den, value: num / den };
}

export function normalizeCameraMetadata(
  input: Partial<CameraMetadata> | undefined,
): CameraMetadata {
  return {
    aperture: input?.aperture ?? "",
    shutterSpeed: input?.shutterSpeed ?? "",
    iso: input?.iso ?? "",
    camera: input?.camera ?? "",
    lens: input?.lens ?? "",
    focalLength: input?.focalLength ?? "",
  };
}

export function parseCameraMetadata(exif: Buffer | undefined): CameraMetadata {
  if (!exif || exif.length < 14) return { ...EMPTY_CAMERA_METADATA };

  const tiffStart = exif.subarray(0, 6).toString("latin1") === "Exif\0\0" ? 6 : 0;
  const byteOrder = exif.subarray(tiffStart, tiffStart + 2).toString("latin1");
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") return { ...EMPTY_CAMERA_METADATA };

  const view = new DataView(exif.buffer, exif.byteOffset, exif.byteLength);
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) {
    return { ...EMPTY_CAMERA_METADATA };
  }

  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0 = readEntries(exif, view, tiffStart, firstIfdOffset, littleEndian);
  const exifIfdPointer = readInteger(
    ifd0.find((entry) => entry.tag === 0x8769),
    view,
    littleEndian,
  );
  const exifIfd =
    exifIfdPointer === null
      ? []
      : readEntries(exif, view, tiffStart, exifIfdPointer, littleEndian);
  const entries = [...ifd0, ...exifIfd];
  const make = readAscii(
    ifd0.find((entry) => entry.tag === 0x010f),
    exif,
  );
  const model = readAscii(
    ifd0.find((entry) => entry.tag === 0x0110),
    exif,
  );
  const lens = readAscii(
    exifIfd.find((entry) => entry.tag === 0xa434),
    exif,
  );

  const aperture = readRational(
    entries.find((entry) => entry.tag === 0x829d),
    view,
    littleEndian,
  );
  const shutterSpeed = readRational(
    entries.find((entry) => entry.tag === 0x829a),
    view,
    littleEndian,
  );
  const iso = readInteger(
    entries.find((entry) => entry.tag === 0x8827),
    view,
    littleEndian,
  );
  const focalLength = readRational(
    entries.find((entry) => entry.tag === 0x920a),
    view,
    littleEndian,
  );

  return {
    aperture: aperture ? formatAperture(aperture.value) : "",
    shutterSpeed: shutterSpeed
      ? formatShutterSpeed(shutterSpeed.num, shutterSpeed.den)
      : "",
    iso: iso && iso > 0 ? String(iso) : "",
    camera: [make, model].filter(Boolean).join(" "),
    lens,
    focalLength: focalLength ? formatFocalLength(focalLength.value) : "",
  };
}
