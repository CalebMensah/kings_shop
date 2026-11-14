import { ProductCard } from "@/components/storefront/ProductCard";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { CategoryRail } from "@/components/storefront/CategoryRail";
import { createClient } from "@/lib/supabase/server";
import { getMainCategories } from "@/lib/categories";
import { getProductsPage, newSeed } from "@/lib/products";
import { ESTIMATED_ARRIVAL } from "@/lib/constants";
import { getCurrentBatch } from "@/lib/batches";
import { BatchBanner } from "@/components/storefront/BatchBanner";
import {
  Hero,
  ProductSection,
  ImportEnquirySection,
  HowItWorks,
  WhyKings,
  ReviewGallery,
  ContactBlock,
} from "@/components/storefront/HomeSections";

export default async function HomePage() {
  const supabase = await createClient();
  const batch = await getCurrentBatch(supabase);

  // A fresh random pick on every visit so older products stay in view
  const seed = newSeed();
  const [categories, { products: availableProducts }, { products: preorderProducts }] = await Promise.all([
    getMainCategories(supabase),
    getProductsPage(supabase, { page: 0, seed, limit: 4, availability: "available" }),
    getProductsPage(supabase, { page: 0, seed, limit: 4, availability: "preorder" }),
  ]);

  const shownSlugs = [...availableProducts, ...preorderProducts].map((product) => product.slug);

  return (
    <div className="pb-4">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <BatchBanner batch={batch} />
        <Hero />

        {categories.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg text-navy-900 mb-4">Shop by category</h2>
            <CategoryRail categories={categories} />
          </section>
        )}
      </div>

      {availableProducts.length > 0 && (
        <ProductSection
          title="Available now"
          subtitle="In stock and ready to ship or pick up."
          href="/shop?availability=available"
        >
          {availableProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </ProductSection>
      )}

      {preorderProducts.length > 0 && (
        <ProductSection
          title="Preorder"
          subtitle={`Sourced for your order. Estimated arrival in Ghana: ${ESTIMATED_ARRIVAL}.`}
          href="/shop?availability=preorder"
        >
          {preorderProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </ProductSection>
      )}

      <ImportEnquirySection />
      <HowItWorks />
      <WhyKings />
      <ReviewGallery />
      <ContactBlock />

      <RecentlyViewed excludeSlugs={shownSlugs} />
    </div>
  );
}
