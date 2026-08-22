import PageLayout from "./PageLayout";
import { Link } from "react-router-dom";
import { BarChart3, ShieldCheck, Wallet } from "lucide-react";
import CarDetails from "./CarDetails";

function Home() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground">
          Welcome to <span className="text-primary">Quotio</span>
        </h1>
        <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-muted-foreground">
          Your comprehensive, data-driven vehicle cost intelligence dashboard. Analyze monthly operational expenses, evaluate long-term reliability metrics, and discover optimal car models tailored to your needs.
        </p>
      </div>

      {/* Call to action (CTA) buttons */}
      <div className="mb-20">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Cost Calculator CTA */}
          <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card/75 p-8 shadow-sm shadow-black/20 transition-colors hover:border-primary/50">
            <h3 className="mb-3 text-2xl font-bold text-card-foreground">
              Monthly Cost Calculator
            </h3>
            <p className="mb-6 text-muted-foreground">
              Get accurate estimates of your monthly insurance and operational costs based on your vehicle and personal information.
            </p>
            <Link
              to="/calculate"
              className="mt-auto inline-flex self-start rounded-md border border-primary/45 bg-primary/20 px-6 py-2 font-semibold text-primary hover:bg-primary/30"
            >
              Calculate Now
            </Link>
          </div>

          {/* Vehicle recalls CTA */}
          <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card/75 p-8 shadow-sm shadow-black/20 transition-colors hover:border-primary/50">
            <h3 className="mb-3 text-2xl font-bold text-card-foreground">
              Vehicle Recalls
            </h3>
            <p className="mb-6 text-muted-foreground">
              Check important safety recalls for your vehicle to ensure you're aware of any critical issues or recalls.
            </p>
            <Link
              to="/recalls"
              className="mt-auto inline-flex self-start rounded-md border border-primary/45 bg-primary/20 px-6 py-2 font-semibold text-primary hover:bg-primary/30"
            >
              Check Recalls
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-20">
        <div className="mb-6 rounded-xl border border-border/70 bg-card/65 p-5">
          <h2 className="text-2xl font-bold text-card-foreground">Vehicle Specifications</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Quickly look up official EPA-backed vehicle details including fuel economy, drivetrain, and trim-specific technical data.
          </p>
        </div>
        <CarDetails embedded={true} />
      </div>

      {/* Feature Highlihts */}
      <div className="mb-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">Why Choose Quotio?</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Data-Driven Insights</h3>
            <p className="text-muted-foreground">
              Get accurate cost analysis and vehicle recommendations based on comprehensive data.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Safety First</h3>
            <p className="text-muted-foreground">
              Stay informed about critical vehicle recalls and safety issues that matter to you.
            </p>
          </div>

          {/* feature 3 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Cost Optimization</h3>
            <p className="text-muted-foreground">
              Understand monthly expenses upfront and make informed decisions about your vehicle.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default Home;
