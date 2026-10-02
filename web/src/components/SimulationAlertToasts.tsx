import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import type { SimulationAlert } from '../lib/simulateEngine';
import './SimulationAlertToasts.css';

interface SimulationAlertToastsProps {
  alerts: SimulationAlert[];
  onDismiss: (alertId: string) => void;
}

export const SimulationAlertToasts: React.FC<SimulationAlertToastsProps> = ({
  alerts,
  onDismiss,
}) => {
  // Auto-dismiss alert after 6s
  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    const timer = setTimeout(() => {
      onDismiss(latest.alert_id);
    }, 6000);
    return () => clearTimeout(timer);
  }, [alerts, onDismiss]);

  // Max 3 stacked toasts, showing the latest 3
  const visibleAlerts = alerts.slice(-3);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="sim-toasts-container" aria-live="assertive">
      {visibleAlerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        return (
          <div
            key={alert.alert_id}
            className={`sim-toast-item ${isCritical ? 'critical' : 'high'}`}
            role={isCritical ? 'alert' : 'status'}
          >
            <div className="sim-toast-icon-wrap">
              {isCritical ? (
                <AlertCircle size={16} color="var(--risk)" />
              ) : (
                <AlertTriangle size={16} color="var(--signal)" />
              )}
            </div>

            <div className="sim-toast-body">
              <div className="sim-toast-title-line">
                <span className={`sim-toast-severity ${isCritical ? 'critical' : 'high'}`}>
                  {alert.severity}
                </span>
                <span className="sim-toast-dot">·</span>
                <span className="sim-toast-title">{alert.title}</span>
                <span className="sim-toast-dot">·</span>
                <span className="sim-toast-ring mono">Ring {alert.ring_id}</span>
              </div>
              <div className="sim-toast-detail">{alert.detail}</div>
            </div>

            <button
              type="button"
              className="sim-toast-close"
              onClick={() => onDismiss(alert.alert_id)}
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
