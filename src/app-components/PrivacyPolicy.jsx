import PageLayout from "./PageLayout";

function PrivacyPolicy() {
  return (
    <PageLayout>
      <div className="mb-12">
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="max-w-3xl text-xl leading-relaxed text-muted-foreground">
          Last updated: June 2026
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Introduction</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Quotio ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Information We Collect</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            We may collect certain information from you. The information we may collect on the site includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Personal Information: Such as your name, email address, and any other information you voluntarily provide when using our services.</li>
            <li>Usage Data: Information about how you interact with our services, including pages visited, time spent, and actions taken.</li>
            <li>Cookies and Tracking Technologies: We use cookies to enhance your experience and gather information about site usage.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">How We Use Your Information</h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Provide and maintain our services</li>
            <li>Calculate and display vehicle cost estimates and recall information</li>
            <li>Improve and optimize our website and services</li>
            <li>Send administrative and marketing communications</li>
            <li>Respond to your inquiries and support requests</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Data Security</h2>
          <p className="leading-relaxed text-muted-foreground">
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-6">
          <h2 className="mb-4 text-2xl font-bold text-card-foreground">Contact Us</h2>
          <p className="leading-relaxed text-muted-foreground">
            If you have questions about this Privacy Policy, please contact us at contact@quotio.com.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

export default PrivacyPolicy;
