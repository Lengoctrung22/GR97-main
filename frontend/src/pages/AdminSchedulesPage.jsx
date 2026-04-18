import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { CalendarClock, Filter, Hospital, Search, UserRound, UserCog } from "lucide-react";
import { api } from "../lib/api";

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const statusActions = ["pending", "confirmed", "completed", "cancelled"];

const AdminSchedulesPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (keyword.trim()) params.q = keyword.trim();
      if (doctorFilter) params.doctorId = doctorFilter;
      
      // Handle date filtering
      if (dayFilter === "today") {
        params.dateFrom = dayjs().startOf("day").toISOString();
        params.dateTo = dayjs().endOf("day").toISOString();
      } else if (dayFilter === "tomorrow") {
        params.dateFrom = dayjs().add(1, "day").startOf("day").toISOString();
        params.dateTo = dayjs().add(1, "day").endOf("day").toISOString();
      } else if (dayFilter === "custom") {
        if (dateFrom) params.dateFrom = dayjs(dateFrom).startOf("day").toISOString();
        if (dateTo) params.dateTo = dayjs(dateTo).endOf("day").toISOString();
      }

      const { data } = await api.get("/admin/appointments", { params });
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được lịch hẹn.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data } = await api.get("/doctors?limit=100");
      setDoctors(data.doctors || []);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dayFilter, doctorFilter, dateFrom, dateTo]);

  const submitSearch = (e) => {
    e.preventDefault();
    loadAppointments();
  };

  const updateStatus = async (appointmentId, status) => {
    setUpdatingId(appointmentId);
    setError("");
    try {
      const { data } = await api.patch(`/admin/appointments/${appointmentId}/status`, {
        status,
      });
      setAppointments((prev) =>
        prev.map((item) => (item._id === appointmentId ? data.appointment : item))
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Không cập nhật được trạng thái.");
    } finally {
      setUpdatingId("");
    }
  };

  const totals = useMemo(
    () => ({
      all: appointments.length,
      pending: appointments.filter((item) => item.status === "pending").length,
      confirmed: appointments.filter((item) => item.status === "confirmed").length,
      completed: appointments.filter((item) => item.status === "completed").length,
    }),
    [appointments]
  );

  return (
    <section className="stack-md">
      <div className="section-title-row">
        <div>
          <h1>Quản lý Lịch khám.</h1>
          <p className="muted">Quản lý danh sách lịch hẹn, lọc nhanh và cập nhật trạng thái.</p>
        </div>
      </div>

      <article className="schedule-toolbar-card">
        <div className="schedule-filter-group">
          <label>
            <Filter size={15} /> Trạng thái
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="schedule-filter-group">
          <label>
            <CalendarClock size={15} /> Ngày khám
          </label>
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="tomorrow">Ngày mai</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
        </div>
        
        {dayFilter === "custom" && (
          <>
            <div className="schedule-filter-group">
              <label>Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="schedule-filter-group">
              <label>Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </>
        )}
        
        <div className="schedule-filter-group">
          <label>
            <UserCog size={15} /> Bác sĩ
          </label>
          <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
            <option value="">Tất cả bác sĩ</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.fullName}
              </option>
            ))}
          </select>
        </div>
        <form className="schedule-filter-group schedule-search" onSubmit={submitSearch}>
          <label>
            <Search size={15} /> Tìm kiếm
          </label>
          <div className="row gap-sm">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên bệnh nhân, bác sĩ, mã lịch hẹn..."
            />
            <button type="submit" className="btn-secondary">
              Tìm
            </button>
          </div>
        </form>
      </article>

      <div className="schedule-stats-grid">
        <article className="schedule-stat-card">
          <small>Tổng lịch</small>
          <h3>{totals.all}</h3>
        </article>
        <article className="schedule-stat-card">
          <small>Chờ xác nhận</small>
          <h3>{totals.pending}</h3>
        </article>
        <article className="schedule-stat-card">
          <small>Đã xác nhận</small>
          <h3>{totals.confirmed}</h3>
        </article>
        <article className="schedule-stat-card">
          <small>Hoàn thành</small>
          <h3>{totals.completed}</h3>
        </article>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <article className="admin-table-card">
        <div className="section-title-row">
          <h3>Danh sách lịch hẹn</h3>
          <span className="muted">{appointments.length} lịch</span>
        </div>
        {loading ? <p className="muted">Đang tải dữ liệu lịch hẹn...</p> : null}
        {!loading && appointments.length === 0 ? <p className="muted">Không có lịch hẹn phù hợp.</p> : null}

        {!loading && appointments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Bệnh nhân</th>
                <th>Bác sĩ</th>
                <th>Cơ sở</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="row gap-sm">
                      <UserRound size={14} />
                      {item.user?.fullName || "Khách hàng"}
                    </div>
                  </td>
                  <td>{item.doctor?.fullName || item.doctorName || "Bác sĩ"}</td>
                  <td>
                    <div className="row gap-sm">
                      <Hospital size={14} />
                      {item.hospital || "Cơ sở Đà Nẵng"}
                    </div>
                  </td>
                  <td>{dayjs(item.appointmentAt).format("HH:mm, DD/MM/YYYY")}</td>
                  <td>
                    <span className={`status status-${item.status}`}>{item.status}</span>
                  </td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item._id, e.target.value)}
                      disabled={updatingId === item._id}
                    >
                      {statusActions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </article>
    </section>
  );
};

export default AdminSchedulesPage;
