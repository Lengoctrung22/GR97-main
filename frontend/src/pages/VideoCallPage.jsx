import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import VideoConsultation from "../components/VideoConsultation";
import { ArrowLeft } from "lucide-react";

export default function VideoCallPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get("appointmentId");
  const doctorId = searchParams.get("doctorId");
  const patientName = searchParams.get("patientName");

  const handleEndCall = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Video Consultation</h1>
            {patientName && (
              <p className="text-sm text-gray-600">Patient: {patientName}</p>
            )}
          </div>
        </div>

        {/* Video Component */}
        <VideoConsultation
          appointmentId={appointmentId}
          doctorId={doctorId}
          patientName={patientName}
          onEnd={handleEndCall}
        />
      </div>
    </div>
  );
}
