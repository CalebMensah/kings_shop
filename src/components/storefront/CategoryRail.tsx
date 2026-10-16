import Link from "next/link";
import Image from "next/image";

type RailCategory = { name: string; slug: string; image_url: string | null };

export function CategoryRail({
  categories,
  showAll = false,
}: {
  categories: RailCategory[];
  showAll?: boolean;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      {showAll && (
        <Link href="/shop" className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 border-turquoise-dark bg-turquoise/10">
            <span className="text-xs text-navy-700 font-medium">All</span>
          </div>
          <span className="text-xs text-navy-900 font-medium">All</span>
        </Link>
      )}

      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="flex flex-col items-center gap-2 shrink-0 group"
        >
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-navy-100 group-hover:border-turquoise-dark transition">
            {cat.image_url ? (
              <Image src={cat.image_url} alt={cat.name} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="w-full h-full bg-navy-50 flex items-center justify-center">
                <span className="text-[10px] text-navy-400 px-1 text-center leading-tight">{cat.name}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-navy-600 text-center max-w-[84px] leading-tight">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
