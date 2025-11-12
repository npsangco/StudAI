// Toast.jsx - Reusable Toast Notification Component
import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const Toast = ({ id, message, type = "info", onDismiss, duration = 3000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, onDismiss, duration]);

  const variants = {
    success: {
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-600",
      hoverColor: "hover:text-green-800",
      icon: CheckCircle,
    },
    error: {
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-600",
      hoverColor: "hover:text-red-800",
      icon: AlertCircle,
    },
    info: {
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600",
      hoverColor: "hover:text-blue-800",
      icon: Info,
    },
    warning: {
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
      hoverColor: "hover:text-yellow-800",
      icon: AlertCircle,
    },
  };

  const variant = variants[type] || variants.info;
  const Icon = variant.icon;

  return (
    <div
      role="alert"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`${variant.bgColor} ${variant.borderColor} border rounded-lg p-3 shadow-lg flex items-center gap-3 max-w-sm animate-slide-in`}
    >
      <Icon size={18} className={`flex-shrink-0 ${variant.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${variant.textColor}`}>{message}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className={`${variant.iconColor} ${variant.hoverColor} transition-colors flex-shrink-0`}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
