const BrandLogo = ({ title = "HealthAI Da Nang", subtitle = "" }) => {
  return (
    <div className="brand-logo">
      <div className="brand-icon">
        <svg viewBox="0 0 54 36" aria-hidden="true">
          <rect x="0" y="4" width="14" height="28" rx="7" />
          <rect x="20" y="2" width="14" height="32" rx="7" />
          <rect x="40" y="4" width="14" height="28" rx="7" />
        </svg>
      </div>
      <div>
        <p className="brand-title">{title}</p>
        {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
};

export default BrandLogo;
