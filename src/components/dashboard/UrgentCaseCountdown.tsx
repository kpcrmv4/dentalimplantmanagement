'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrgentCaseCountdownProps {
  surgeryDate: string;
  surgeryTime?: string;
  className?: string;
}

export function UrgentCaseCountdown({ surgeryDate, surgeryTime, className }: UrgentCaseCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, isUrgent: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const surgery = new Date(surgeryDate);

      if (surgeryTime) {
        const [hours, minutes] = surgeryTime.split(':').map(Number);
        surgery.setHours(hours, minutes, 0, 0);
      } else {
        surgery.setHours(8, 0, 0, 0);
      }

      const diff = surgery.getTime() - now.getTime();
      const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

      setTimeLeft({
        hours,
        minutes,
        isUrgent: hours < 6,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [surgeryDate, surgeryTime]);

  const getColorClass = () => {
    if (timeLeft.hours < 6) return 'bg-red-100 text-red-700';
    if (timeLeft.hours < 24) return 'bg-orange-100 text-orange-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const formatDisplay = () => {
    if (timeLeft.hours >= 24) {
      const days = Math.floor(timeLeft.hours / 24);
      return `${days} วัน`;
    }
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours} ชม.`;
    }
    return `${timeLeft.minutes} นาที`;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        getColorClass(),
        className
      )}
    >
      <Clock className="w-3 h-3" />
      <span>{formatDisplay()}</span>
    </div>
  );
}
