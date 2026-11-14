import { HiOutlineClock, HiOutlineSparkles } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { daysUntil, type CurrentBatch } from "@/lib/batches";
import { ESTIMATED_ARRIVAL } from "@/lib/constants";
import { whatsappUrl } from "@/lib/whatsapp";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BatchBanner({ batch }: { batch: CurrentBatch }) {
  // No batch open
  if (!batch) {
    return (
      <div className="bg-navy-50 border border-navy-100 rounded px-4 py-3 mb-6 flex items-start gap-3 text-sm text-navy-600">
        <HiOutlineClock className="w-5 h-5 text-navy-400 shrink-0 mt-0.5" />
        <p>
          We&apos;re between preorder batches right now — orders placed today will join our next batch.
          Preorder items arrive in {ESTIMATED_ARRIVAL}.
        </p>
      </div>
    );
  }

  const daysLeft = daysUntil(batch.target_closes_at);
  const isPast = daysLeft !== null && daysLeft < 0;

  // Closing date has passed but the batch hasn't been closed yet: never present it as active
  if (isPast && batch.target_closes_at) {
    return (
      <div className="bg-navy-50 border border-navy-100 rounded px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-navy-700">
        <div className="flex items-start gap-3">
          <HiOutlineClock className="w-5 h-5 text-navy-400 shrink-0 mt-0.5" />
          <p>
            <strong>{batch.name}</strong> reached its closing date on {formatDate(batch.target_closes_at)}.
            Message us to confirm which batch a new order will join.
          </p>
        </div>
        <a
          href={whatsappUrl(`Hello Kings Shop & Importation, which preorder batch will my order join? (${batch.name} has closed)`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded bg-[#25D366] px-3 py-2 text-xs font-medium text-white hover:brightness-95 shrink-0"
        >
          <FaWhatsapp className="w-4 h-4" /> Ask on WhatsApp
        </a>
      </div>
    );
  }

  const isUrgent = daysLeft !== null && daysLeft <= 10;

  return (
    <div
      className={`rounded px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 text-sm ${
        isUrgent
          ? "bg-amber-50 border border-amber-200 text-amber-900"
          : "bg-turquoise/10 border border-turquoise/20 text-navy-700"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <HiOutlineSparkles
          className={`w-5 h-5 shrink-0 mt-0.5 ${isUrgent ? "text-amber-600" : "text-turquoise-dark"}`}
        />
        <div className="min-w-0">
          <p>
            <strong>{batch.name}</strong> is open for preorders
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {batch.target_closes_at ? `Closes ${formatDate(batch.target_closes_at)} · ` : ""}
            Estimated arrival in Ghana: {ESTIMATED_ARRIVAL}
          </p>
        </div>
      </div>

      {daysLeft !== null && (
        <span
          className={`self-start sm:self-center shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
            isUrgent ? "bg-amber-100 text-amber-800" : "bg-white text-navy-600 border border-navy-100"
          }`}
        >
          {daysLeft === 0 ? "Closes today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
        </span>
      )}
    </div>
  );
}
