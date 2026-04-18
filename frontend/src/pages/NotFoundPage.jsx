import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <section className="placeholder-page">
      <h2>404</h2>
      <p className="muted">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className="btn-primary">
        Back to home
      </Link>
    </section>
  );
};

export default NotFoundPage;
