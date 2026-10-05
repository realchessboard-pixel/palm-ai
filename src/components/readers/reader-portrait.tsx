import type { Reader } from "@/lib/readers/catalog";

/**
 * A flat, paper-cut style illustration of a reader. Deliberately an
 * illustration — PalmAI's readers are AI characters, not photographs of people.
 */
export function ReaderPortrait({
  reader,
  size = 96,
  className,
}: {
  reader: Reader;
  size?: number;
  className?: string;
}) {
  const { skin, hair, cloth, bg, accent } = reader.palette;
  const s = reader.hairStyle;
  const feminine = s === "bun" || s === "long" || s === "braid";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Illustration of ${reader.name}, an AI reader`}
    >
      <defs>
        <clipPath id={`clip-${reader.id}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${reader.id})`}>
        <rect width="100" height="100" fill={bg} />
        {/* block-print motif behind the figure */}
        <g fill={accent} opacity="0.13">
          {[14, 50, 86].map((x) =>
            [16, 52, 88].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />),
          )}
        </g>
        {s === "long" || s === "braid" ? (
          <path d="M28 40 Q26 78 34 92 L66 92 Q74 78 72 40 Z" fill={hair} />
        ) : null}
        {/* shoulders */}
        <path d="M14 104 Q16 76 50 74 Q84 76 86 104 Z" fill={cloth} />
        {feminine ? (
          <path d="M30 80 Q50 96 74 78 L80 84 Q50 104 24 86 Z" fill={accent} opacity="0.85" />
        ) : (
          <path d="M44 75 L50 86 L56 75 Z" fill={bg} opacity="0.7" />
        )}
        {/* neck */}
        <rect x="43" y="60" width="14" height="16" rx="6" fill={skin} />
        {/* head */}
        <ellipse cx="50" cy="45" rx="17" ry="20" fill={skin} />
        {/* hair */}
        {s === "bun" ? (
          <>
            <circle cx="50" cy="22" r="8" fill={hair} />
            <path d="M33 44 Q32 24 50 24 Q68 24 67 44 Q62 31 50 31 Q38 31 33 44 Z" fill={hair} />
          </>
        ) : s === "long" || s === "braid" ? (
          <path d="M32 50 Q30 24 50 24 Q70 24 68 50 Q64 32 50 31 Q36 32 32 50 Z" fill={hair} />
        ) : s === "turban" ? (
          <path d="M31 40 Q32 20 50 20 Q68 20 69 40 Q60 33 50 33 Q40 33 31 40 Z" fill={accent} />
        ) : (
          <path
            d="M33 42 Q31 24 50 24 Q69 24 67 42 Q63 31 50 31 Q38 31 33 42 Z"
            fill={s === "grey-short" ? "#e6e1d8" : hair}
          />
        )}
        {s === "braid" ? (
          <path
            d="M66 50 Q72 66 66 84"
            stroke={hair}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        {/* ears */}
        <ellipse cx="33" cy="47" rx="2.5" ry="4" fill={skin} />
        <ellipse cx="67" cy="47" rx="2.5" ry="4" fill={skin} />
        {feminine ? (
          <>
            <circle cx="33" cy="53" r="1.6" fill="#d9a441" />
            <circle cx="67" cy="53" r="1.6" fill="#d9a441" />
          </>
        ) : null}
        {/* face: calm, slightly closed eyes and a small smile */}
        <g stroke="#2b1d16" strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M40 46 Q43 48 46 46" />
          <path d="M54 46 Q57 48 60 46" />
          <path d="M39 40 Q43 38 46 40" opacity="0.7" />
          <path d="M54 40 Q57 38 61 40" opacity="0.7" />
          <path d="M45 56 Q50 59 55 56" />
        </g>
        {reader.extra === "bindi" ? <circle cx="50" cy="38" r="1.8" fill="#b3261e" /> : null}
        {reader.extra === "tilak" ? (
          <path d="M50 31 L50 40" stroke="#c4421f" strokeWidth="2.4" strokeLinecap="round" />
        ) : null}
        {reader.extra === "glasses" ? (
          <g stroke="#2b1d16" strokeWidth="1.3" fill="none">
            <circle cx="43" cy="46" r="5" />
            <circle cx="57" cy="46" r="5" />
            <path d="M48 46 L52 46" />
          </g>
        ) : null}
        {reader.extra === "moustache" ? (
          <path d="M43 53 Q50 50 57 53 Q50 55 43 53 Z" fill={hair} />
        ) : null}
        {reader.extra === "beard" ? (
          <path d="M34 50 Q36 68 50 69 Q64 68 66 50 Q60 60 50 60 Q40 60 34 50 Z" fill={hair} />
        ) : null}
      </g>
    </svg>
  );
}
