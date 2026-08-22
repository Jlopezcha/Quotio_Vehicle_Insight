import PageLayout from "./PageLayout";

function TermsOfService() {
  return (
    <PageLayout>
      <div className="mb-12">
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
        <p className="max-w-3xl text-xl leading-relaxed text-muted-foreground">Last updated: June 2026</p>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Agreement to Terms</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            By accessing and using this website, you accept and agree to be bound by these terms.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Use License</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Permission is granted to temporarily download one copy of the materials on Quotio's website for personal, non-commercial viewing only.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Disclaimer</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            The materials on Quotio's website are provided "as is" without warranties of any kind.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Contact Us</h2>
          <p className="leading-relaxed text-muted-foreground">If you have questions, contact us at contact@quotio.com.</p>
        </section>
      </div>
    </PageLayout>
  );
}

export default TermsOfService;
