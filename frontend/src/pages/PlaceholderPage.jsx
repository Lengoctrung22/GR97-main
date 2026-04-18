const PlaceholderPage = ({ title = "Dang cap nhat", description = "" }) => {
  return (
    <section className="placeholder-page">
      <h1>{title}</h1>
      <p className="muted">{description || "Module nay se duoc cap nhat trong phien ban tiep theo."}</p>
    </section>
  );
};

export default PlaceholderPage;
