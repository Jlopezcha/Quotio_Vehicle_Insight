import PageLayout from "./PageLayout";

function About() {
  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-12">
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground">
          About <span className="text-primary">Quotio</span>
        </h1>
        <p className="max-w-3xl text-xl leading-relaxed text-muted-foreground">
          Quotio is a comprehensive vehicle cost intelligence platform designed to help you make informed decisions about your vehicle investments.
        </p>
      </div>

      {/* Mission Section */}
      <div className="mb-16">
        <h2 className="mb-6 text-3xl font-bold text-foreground">Our Mission</h2>
        <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
          We believe that vehicle ownership decisions should be based on accurate, transparent data. Too often, buyers are caught off guard by unexpected costs or safety issues. Quotio was created to bridge this gap by providing a single platform where you can analyze monthly costs, check vehicle recalls, and get personalized insurance recommendations.
        </p>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Our goal is to empower you with the information you need to choose the right vehicle and understand the true cost of ownership before making your decision.
        </p>
      </div>

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="mb-8 text-3xl font-bold text-foreground">What We Offer</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Feature 1 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <h3 className="mb-3 text-xl font-bold text-card-foreground">Monthly Cost Calculator</h3>
            <p className="text-muted-foreground">
              Calculate accurate monthly insurance premiums and operational costs for any vehicle. Our calculator uses real-world data to give you honest estimates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <h3 className="mb-3 text-xl font-bold text-card-foreground">Vehicle Recalls Database</h3>
            <p className="text-muted-foreground">
              Access comprehensive recall information to ensure the vehicle you're interested in doesn't have critical safety issues.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <h3 className="mb-3 text-xl font-bold text-card-foreground">Insurance Recommendations</h3>
            <p className="text-muted-foreground">
              Get personalized insurance coverage recommendations based on your vehicle, driving habits, and financial situation.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <h3 className="mb-3 text-xl font-bold text-card-foreground">Data-Driven Insights</h3>
            <p className="text-muted-foreground">
              Make informed decisions with access to historical data, reliability metrics, and cost trends across different vehicle models.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-20">
        <h2 className="mb-8 text-3xl font-bold text-foreground">Our Values</h2>
        <div className="space-y-4">
          <div className="flex items-start rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="mr-4 text-2xl text-primary">✓</div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">Transparency</h3>
              <p className="text-muted-foreground">We provide accurate, unbiased information to help you make the best decisions for your situation.</p>
            </div>
          </div>
          <div className="flex items-start rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="mr-4 text-2xl text-primary">✓</div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">Reliability</h3>
              <p className="text-muted-foreground">Our data comes from trusted sources and is continuously updated to ensure accuracy.</p>
            </div>
          </div>
          <div className="flex items-start rounded-lg border border-border/60 bg-card/60 p-4">
            <div className="mr-4 text-2xl text-primary">✓</div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">User-Focused</h3>
              <p className="text-muted-foreground">Every feature is designed with your needs in mind, making vehicle decisions simple and straightforward.</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default About;
