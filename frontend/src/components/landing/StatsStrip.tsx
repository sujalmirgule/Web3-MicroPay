import React from "react";
import { Users, BarChart3, ShieldCheck, Cpu } from "lucide-react";

export interface StatItem {
  icon: React.ReactNode;
  value: string;
  label: string;
}

export const StatsStrip: React.FC = () => {
  const stats: StatItem[] = [
    {
      icon: <Users size={16} />,
      value: "50K+",
      label: "Users Worldwide",
    },
    {
      icon: <BarChart3 size={16} />,
      value: "$12M+",
      label: "Volume Settled",
    },
    {
      icon: <ShieldCheck size={16} />,
      value: "99.9%",
      label: "Uptime Reliability",
    },
    {
      icon: <Cpu size={16} />,
      value: "2.4K+",
      label: "Active Nodes",
    },
  ];

  return (
    <div className="lp-hero-stats-row">
      {stats.map((stat, idx) => (
        <div key={idx} className="lp-stat-item">
          <div className="lp-stat-icon-wrap">{stat.icon}</div>
          <div>
            <div className="lp-stat-value">{stat.value}</div>
            <div className="lp-stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default StatsStrip;
