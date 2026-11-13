import Image from "next/image";
import { HiOutlineMinus, HiOutlinePlus } from "react-icons/hi";

export type SelectionRow = {
  key: string;
  label: string;
  price: number;
  image: string | null;
  note?: string;
  inCart: number;
  qty: number;
  atMax: boolean;
};

export function SelectionList({
  rows,
  onStep,
}: {
  rows: SelectionRow[];
  onStep: (key: string, delta: 1 | -1) => void;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const skipped = row.qty === 0;
        return (
          <li
            key={row.key}
            className={`flex items-center gap-3 rounded border border-navy-100 bg-white px-3 py-2 ${
              skipped ? "opacity-60" : ""
            }`}
          >
            {row.image && (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-navy-50">
                <Image src={row.image} alt="" fill className="object-cover" sizes="40px" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm text-navy-800 break-words">{row.label}</p>
              <p className="text-xs text-navy-400">
                GH₵{row.price.toFixed(2)}
                {row.note ? ` · ${row.note}` : ""}
                {row.inCart > 0 ? ` · ${row.inCart} already in cart` : ""}
                {skipped ? " · not included" : ""}
              </p>
            </div>

            <div className="inline-flex shrink-0 items-center rounded-full border border-navy-100">
              <button
                type="button"
                onClick={() => onStep(row.key, -1)}
                disabled={skipped}
                className="px-2.5 py-1.5 text-navy-600 disabled:opacity-30"
                aria-label={`Decrease quantity of ${row.label}`}
              >
                <HiOutlineMinus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{row.qty}</span>
              <button
                type="button"
                onClick={() => onStep(row.key, 1)}
                disabled={row.atMax}
                className="px-2.5 py-1.5 text-navy-600 disabled:opacity-30"
                aria-label={`Increase quantity of ${row.label}`}
              >
                <HiOutlinePlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
