'use client';

import { Fragment, type ReactNode } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  buttonVariant: 'danger' | 'primary';
}> = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonVariant: 'danger',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonVariant: 'primary',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonVariant: 'primary',
  },
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const config = variantConfig[variant];

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Icon */}
            <div
              className={cn(
                'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4',
                config.iconBg,
                config.iconColor
              )}
            >
              {config.icon}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>

            {/* Message */}
            <div className="text-sm text-gray-500 mb-6">
              {message}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={config.buttonVariant}
                className="flex-1"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export { ConfirmModal };
export type { ConfirmModalProps };
