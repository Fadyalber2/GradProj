"use client";

export default function NewsletterCTA() {
  return (
    <section className="py-16 bg-card-dark border-y border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-gradient-to-br from-input-dark to-card-dark p-10 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

          <h3 className="text-white font-bold text-2xl mb-3 relative z-10">
            Don&apos;t Miss the Next Insight
          </h3>
          <p className="text-gray-400 text-base mb-8 relative z-10 max-w-lg mx-auto">
            Join 15,000+ real estate professionals receiving our weekly analysis
            on market trends and co-living innovations.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto relative z-10"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-grow bg-black/40 border border-white/10 rounded-full px-6 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-lg shadow-primary/25 whitespace-nowrap"
            >
              Subscribe Free
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
