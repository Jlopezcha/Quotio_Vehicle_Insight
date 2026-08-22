function PageLayout({ children }) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export default PageLayout;
