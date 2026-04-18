import { useEffect, useState } from "react";
import { Bell, Lock, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const defaultNotifications = {
  appointmentReminders: true,
  labResults: true,
  healthNews: false,
};

const defaultPrivacy = {
  shareRecords: true,
  hideContactInDocs: true,
};

const PatientSettingsPage = () => {
  const { user, refreshUser, setUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [status, setStatus] = useState({
    profile: "",
    password: "",
    notifications: "",
    privacy: "",
  });
  const [error, setError] = useState({
    profile: "",
    password: "",
    notifications: "",
    privacy: "",
  });
  const [saving, setSaving] = useState({
    profile: false,
    password: false,
    notifications: false,
    privacy: false,
  });

  const setSectionState = ({ section, nextError = "", nextStatus = "", nextSaving }) => {
    setError((prev) => ({ ...prev, [section]: nextError }));
    setStatus((prev) => ({ ...prev, [section]: nextStatus }));
    if (typeof nextSaving === "boolean") {
      setSaving((prev) => ({ ...prev, [section]: nextSaving }));
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/users/settings");
        const profile = data.profile || user || {};

        setProfileForm({
          fullName: profile.fullName || "",
          email: profile.email || "",
          phone: profile.phone || "",
        });
        setNotifications({ ...defaultNotifications, ...(data.notifications || {}) });
        setPrivacy({ ...defaultPrivacy, ...(data.privacy || {}) });
      } catch {
        setProfileForm({
          fullName: user?.fullName || "",
          email: user?.email || "",
          phone: user?.phone || "",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const saveProfile = async () => {
    setSectionState({ section: "profile", nextSaving: true });
    try {
      const payload = {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      };
      const { data } = await api.patch("/users/profile", payload);
      if (data.user) setUser((prev) => ({ ...(prev || {}), ...data.user }));
      await refreshUser();
      setSectionState({
        section: "profile",
        nextStatus: "Da luu thong tin tai khoan.",
        nextSaving: false,
      });
    } catch (err) {
      setSectionState({
        section: "profile",
        nextError: err?.response?.data?.message || "Khong luu duoc thong tin tai khoan.",
        nextSaving: false,
      });
    }
  };

  const savePassword = async () => {
    setSectionState({ section: "password", nextSaving: true });
    try {
      await api.patch("/users/password", passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSectionState({
        section: "password",
        nextStatus: "Da cap nhat mat khau.",
        nextSaving: false,
      });
    } catch (err) {
      setSectionState({
        section: "password",
        nextError: err?.response?.data?.message || "Khong cap nhat duoc mat khau.",
        nextSaving: false,
      });
    }
  };

  const saveNotifications = async () => {
    setSectionState({ section: "notifications", nextSaving: true });
    try {
      await api.patch("/users/preferences", { notifications });
      setSectionState({
        section: "notifications",
        nextStatus: "Da luu cai dat thong bao.",
        nextSaving: false,
      });
    } catch (err) {
      setSectionState({
        section: "notifications",
        nextError: err?.response?.data?.message || "Khong luu duoc cai dat thong bao.",
        nextSaving: false,
      });
    }
  };

  const savePrivacy = async () => {
    setSectionState({ section: "privacy", nextSaving: true });
    try {
      await api.patch("/users/preferences", { privacy });
      setSectionState({
        section: "privacy",
        nextStatus: "Da luu cai dat rieng tu.",
        nextSaving: false,
      });
    } catch (err) {
      setSectionState({
        section: "privacy",
        nextError: err?.response?.data?.message || "Khong luu duoc cai dat rieng tu.",
        nextSaving: false,
      });
    }
  };

  return (
    <section className="stack-md">
      <div>
        <h1>Cài đặt tài khoản.</h1>
        <p className="muted">
          Quan ly thong tin ca nhan, mat khau va cac tuy chon bao mat du lieu.
        </p>
      </div>

      {loading ? <p className="muted">Dang tai cai dat...</p> : null}

      <div className="settings-grid">
        <article className="settings-card">
          <h2>
            <UserRound size={20} /> Thong tin tai khoan
          </h2>
          <div className="stack-sm">
            <label>Ho va ten</label>
            <input
              value={profileForm.fullName}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
            />
            <label>Email</label>
            <input
              value={profileForm.email}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <label>So dien thoai</label>
            <input
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <button type="button" className="btn-primary" onClick={saveProfile} disabled={saving.profile}>
            {saving.profile ? "Dang luu..." : "Luu thong tin"}
          </button>
          {status.profile ? <p className="success-text">{status.profile}</p> : null}
          {error.profile ? <p className="error-text">{error.profile}</p> : null}
        </article>

        <article className="settings-card">
          <h2>
            <Lock size={20} /> Bao mat
          </h2>
          <div className="stack-sm">
            <label>Mat khau hien tai</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
            />
            <label>Mat khau moi</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
            />
            <label>Xac nhan mat khau moi</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
            />
          </div>
          <button type="button" className="btn-secondary" onClick={savePassword} disabled={saving.password}>
            {saving.password ? "Dang cap nhat..." : "Cap nhat mat khau"}
          </button>
          {status.password ? <p className="success-text">{status.password}</p> : null}
          {error.password ? <p className="error-text">{error.password}</p> : null}
        </article>

        <article className="settings-card">
          <h2>
            <Bell size={20} /> Thong bao
          </h2>
          <div className="toggle-list">
            <label>
              <input
                type="checkbox"
                checked={notifications.appointmentReminders}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    appointmentReminders: e.target.checked,
                  }))
                }
              />
              Nhac lich kham
            </label>
            <label>
              <input
                type="checkbox"
                checked={notifications.labResults}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, labResults: e.target.checked }))
                }
              />
              Cap nhat ket qua xet nghiem
            </label>
            <label>
              <input
                type="checkbox"
                checked={notifications.healthNews}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, healthNews: e.target.checked }))
                }
              />
              Tin tuc suc khoe
            </label>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={saveNotifications}
            disabled={saving.notifications}
          >
            {saving.notifications ? "Dang luu..." : "Luu thong bao"}
          </button>
          {status.notifications ? <p className="success-text">{status.notifications}</p> : null}
          {error.notifications ? <p className="error-text">{error.notifications}</p> : null}
        </article>

        <article className="settings-card">
          <h2>
            <ShieldCheck size={20} /> Quyen rieng tu
          </h2>
          <p className="muted">
            Quan ly cach du lieu suc khoe cua ban duoc chia se giua cac co so y te.
          </p>
          <div className="toggle-list">
            <label>
              <input
                type="checkbox"
                checked={privacy.shareRecords}
                onChange={(e) =>
                  setPrivacy((prev) => ({ ...prev, shareRecords: e.target.checked }))
                }
              />
              Cho phep lien thong ho so
            </label>
            <label>
              <input
                type="checkbox"
                checked={privacy.hideContactInDocs}
                onChange={(e) =>
                  setPrivacy((prev) => ({ ...prev, hideContactInDocs: e.target.checked }))
                }
              />
              An thong tin lien he tren tai lieu
            </label>
          </div>
          <button type="button" className="btn-secondary" onClick={savePrivacy} disabled={saving.privacy}>
            {saving.privacy ? "Dang luu..." : "Luu cai dat rieng tu"}
          </button>
          {status.privacy ? <p className="success-text">{status.privacy}</p> : null}
          {error.privacy ? <p className="error-text">{error.privacy}</p> : null}
        </article>
      </div>
    </section>
  );
};

export default PatientSettingsPage;
