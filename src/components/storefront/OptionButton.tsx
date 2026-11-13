import Image from "next/image";
import { HiOutlineCheck } from "react-icons/hi";

export function OptionButton({
  name,
  imageUrl,
  chosen,
  disabled,
  title,
  onClick,
}: {
  name: string;
  imageUrl?: string | null;
  chosen: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  if (imageUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={chosen}
        aria-label={name}
        title={title ?? name}
        className={`relative w-14 h-14 rounded border-2 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
          chosen ? "border-navy-800" : "border-navy-100"
        }`}
      >
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes="56px" />
        {chosen && (
          <span className="absolute right-0.5 top-0.5 rounded-full bg-navy-800 p-0.5 text-white">
            <HiOutlineCheck className="w-3 h-3" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={chosen}
      title={title ?? name}
      className={`text-sm px-3 py-1.5 rounded border transition max-w-full text-left break-words disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through ${
        chosen
          ? "border-navy-800 bg-navy-800 text-white"
          : "border-navy-100 text-navy-700 hover:border-navy-300"
      }`}
    >
      {name}
    </button>
  );
}
