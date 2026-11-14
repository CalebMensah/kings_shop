import Link from "next/link";
import Image from "next/image";
import {
  HiOutlineArrowRight,
  HiOutlineShoppingBag,
  HiOutlineCreditCard,
  HiOutlineGlobeAlt,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineSearch,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineLocationMarker,
} from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { BUSINESS, ESTIMATED_ARRIVAL, REVIEW_IMAGES } from "@/lib/constants";
import { whatsappUrl, WHATSAPP_MESSAGES } from "@/lib/whatsapp";

export function WhatsAppLink({
  message,
  children,
  className = "",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded px-5 py-3 text-sm font-medium transition ${className}`}
    >
      <FaWhatsapp className="h-5 w-5 shrink-0" />
      {children}
    </a>
  );
}

export function Hero() {
  return (
    <section className="grid md:grid-cols-[1.2fr_0.8fr] overflow-hidden rounded-lg border border-navy-100 bg-white">
      <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-turquoise-dark mb-3">
          {BUSINESS.tagline} · Cape Coast, Ghana
        </p>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-navy-900 leading-tight">
          Quality goods, sourced from China and beyond, delivered to Ghana.
        </h1>
        <p className="mt-4 text-navy-600 leading-relaxed max-w-xl">
          Fashion, electronics, home items and more. Order from our shop, or tell us what you need
          and we handle the sourcing and importation.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded bg-turquoise-dark px-5 py-3 text-sm font-medium text-white transition hover:bg-turquoise"
          >
            Shop Products
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <WhatsAppLink
            message={WHATSAPP_MESSAGES.wholesale}
            className="bg-[#25D366] text-white hover:brightness-95"
          >
            Import or Wholesale Enquiries
          </WhatsAppLink>
        </div>

        <p className="mt-4 text-xs text-navy-400">
          Preorder items arrive in {ESTIMATED_ARRIVAL} · Price excludes shipping
        </p>
      </div>

      {/* Decorative visual: only on larger screens so phones load less */}
      <div className="relative hidden md:block min-h-[340px]">
        <Image
          src="/hero-visual.jpg"
          alt="Goods shipped from overseas to Ghana"
          fill
          sizes="(min-width: 768px) 40vw, 0px"
          className="object-cover"
        />
      </div>
    </section>
  );
}

export function ProductSection({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-navy-900">{title}</h2>
          {subtitle && <p className="text-sm text-navy-500 mt-1">{subtitle}</p>}
        </div>
        <Link href={href} className="text-sm text-ocean hover:underline shrink-0">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">{children}</div>
    </section>
  );
}

export function ImportEnquirySection() {
  return (
    <section id="import" className="max-w-6xl mx-auto px-4 md:px-6 pt-12 scroll-mt-20">
      <div className="rounded-lg bg-navy-900 text-white p-6 sm:p-8 md:p-10">
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-turquoise-light mb-3">
              Import &amp; wholesale sourcing
            </p>
            <h2 className="font-display text-2xl sm:text-3xl leading-tight">
              Can&apos;t find it on the website? We can source it for you.
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-navy-200">
              <li className="flex gap-3">
                <HiOutlineSearch className="h-5 w-5 shrink-0 text-turquoise-light mt-0.5" />
                <span>Looking for a product that isn&apos;t listed? Message us on WhatsApp and we&apos;ll help find it.</span>
              </li>
              <li className="flex gap-3">
                <HiOutlineGlobeAlt className="h-5 w-5 shrink-0 text-turquoise-light mt-0.5" />
                <span>Need wholesale or bulk quantities from China? We assist with sourcing and importation.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <WhatsAppLink
              message={WHATSAPP_MESSAGES.notFound}
              className="bg-[#25D366] text-white hover:brightness-95"
            >
              Ask us to source a product
            </WhatsAppLink>
            <WhatsAppLink
              message={WHATSAPP_MESSAGES.wholesale}
              className="border border-white/30 text-white hover:bg-white/10"
            >
              Wholesale &amp; bulk enquiries
            </WhatsAppLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: HiOutlineShoppingBag,
    title: "Choose your items",
    text: "Browse the shop. Each product shows whether it is in stock or a preorder.",
  },
  {
    icon: HiOutlineCreditCard,
    title: "Order and pay",
    text: "Pay securely with Mobile Money or bank transfer through Paystack.",
  },
  {
    icon: HiOutlineGlobeAlt,
    title: "We source it",
    text: `Preorder items are bought for your order and arrive in Ghana in ${ESTIMATED_ARRIVAL}. In-stock items are ready sooner.`,
  },
  {
    icon: HiOutlineTruck,
    title: "Delivery or pickup",
    text: `Choose delivery or pickup in ${BUSINESS.location.split(",").pop()?.trim()}. Shipping is confirmed once your order is sourced.`,
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <h2 className="font-display text-2xl text-navy-900 mb-6">How ordering works</h2>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="rounded-lg border border-navy-100 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-turquoise/10 text-turquoise-dark">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-navy-400">Step {i + 1}</span>
              </div>
              <p className="text-sm font-medium text-navy-900">{step.title}</p>
              <p className="text-sm text-navy-600 mt-1 leading-relaxed">{step.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const REASONS = [
  {
    title: "Clear availability",
    text: "Every product is marked In stock or Preorder, so you know what to expect before you order.",
  },
  {
    title: "Secure payment",
    text: "Mobile Money and bank transfer, processed through Paystack.",
  },
  {
    title: "Track your order",
    text: "Use your order number and phone number on our Track Order page.",
  },
  {
    title: "Real support",
    text: `Call or WhatsApp us, or visit us in ${BUSINESS.location.split(",").pop()?.trim()}.`,
  },
  {
    title: "Clear policies",
    text: "Refunds for faulty, damaged or lost items. Our order policies are published in full.",
  },
];

export function WhyKings() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <h2 className="font-display text-2xl text-navy-900 mb-6">Why shop with Kings</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REASONS.map((r) => (
          <div key={r.title} className="flex gap-3 rounded-lg border border-navy-100 bg-white p-5">
            <HiOutlineShieldCheck className="h-5 w-5 shrink-0 text-turquoise-dark mt-0.5" />
            <div>
              <p className="text-sm font-medium text-navy-900">{r.title}</p>
              <p className="text-sm text-navy-600 mt-1 leading-relaxed">{r.text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-navy-500">
        <Link href="/policies" className="text-ocean hover:underline">Order policies</Link>
        {" · "}
        <Link href="/faq" className="text-ocean hover:underline">FAQ</Link>
        {" · "}
        <Link href="/terms" className="text-ocean hover:underline">Terms</Link>
      </p>
    </section>
  );
}

/** Hidden until real review images are added to REVIEW_IMAGES in lib/constants.ts */
export function ReviewGallery() {
  if (REVIEW_IMAGES.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <h2 className="font-display text-2xl text-navy-900 mb-2">What our customers say</h2>
      <p className="text-sm text-navy-500 mb-6">Reviews from customers. Tap a picture to see it full size.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {REVIEW_IMAGES.map((img) => (
          <a
            key={img.src}
            href={img.src}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-[3/4] overflow-hidden rounded-lg border border-navy-100 bg-white"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

export function ContactBlock() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSINESS.location)}`;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div className="rounded-lg border border-navy-100 bg-white p-6 sm:p-8 grid md:grid-cols-[1.2fr_1fr] gap-6 items-center">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-navy-900">Questions? Talk to us.</h2>
          <div className="mt-4 space-y-2 text-sm text-navy-600">
            {BUSINESS.phones.map((p) => (
              <p key={p} className="flex items-center gap-2">
                <HiOutlinePhone className="h-4 w-4 shrink-0 text-navy-400" />
                <a href={`tel:${p}`} className="hover:text-navy-900">{p}</a>
              </p>
            ))}
            <p className="flex items-center gap-2 break-all">
              <HiOutlineMail className="h-4 w-4 shrink-0 text-navy-400" />
              <a href={`mailto:${BUSINESS.email}`} className="hover:text-navy-900">{BUSINESS.email}</a>
            </p>
            <p className="flex items-start gap-2">
              <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-navy-400 mt-0.5" />
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-navy-900">
                {BUSINESS.location}
              </a>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <WhatsAppLink
            message={WHATSAPP_MESSAGES.general}
            className="bg-[#25D366] text-white hover:brightness-95"
          >
            Chat with us on WhatsApp
          </WhatsAppLink>
          <Link
            href="/faq"
            className="inline-flex items-center justify-center rounded border border-navy-200 px-5 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
          >
            Read the FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
