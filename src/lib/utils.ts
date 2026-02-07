import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, formatStr, { locale: th });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd MMM yyyy HH:mm', { locale: th });
}

export function formatThaiDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  const thaiYear = d.getFullYear() + 543;
  return format(d, `dd MMMM`, { locale: th }) + ` ${thaiYear}`;
}

export function formatThaiDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  const thaiYear = d.getFullYear() + 543;
  return format(d, `dd MMM`, { locale: th }) + ` ${thaiYear}`;
}

export function formatThaiDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  const thaiYear = d.getFullYear() + 543;
  return format(d, `dd MMMM`, { locale: th }) + ` ${thaiYear} ` + format(d, 'HH:mm', { locale: th }) + ' น.';
}

export function formatTime(time: string): string {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes} น.`;
}

// Number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Status color utilities
export function getCaseStatusColor(status: string): string {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
  };
  return colors[status] || colors.gray;
}

export function getCaseStatusDot(status: string): string {
  const colors: Record<string, string> = {
    gray: 'bg-gray-400',
    green: 'bg-green-500',
    yellow: 'bg-orange-500',
    red: 'bg-red-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-gray-400',
  };
  return colors[status] || colors.gray;
}

export function getCaseStatusText(status: string): string {
  const texts: Record<string, string> = {
    gray: 'ยังไม่จอง',
    green: 'พร้อม',
    yellow: 'อยู่ระหว่างจัดส่ง',
    red: 'ขาด',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  };
  return texts[status] || 'ไม่ทราบสถานะ';
}

export function getReservationStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: 'รอดำเนินการ',
    confirmed: 'ยืนยันแล้ว',
    prepared: 'เตรียมของแล้ว',
    used: 'ใช้แล้ว',
    cancelled: 'ยกเลิก',
  };
  return texts[status] || 'ไม่ทราบสถานะ';
}

export function getOrderStatusText(status: string): string {
  const texts: Record<string, string> = {
    draft: 'ร่าง',
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    ordered: 'สั่งซื้อแล้ว',
    shipped: 'กำลังจัดส่ง',
    received: 'รับของแล้ว',
    cancelled: 'ยกเลิก',
  };
  return texts[status] || 'ไม่ทราบสถานะ';
}

export function getTransferTypeText(type: string): string {
  const texts: Record<string, string> = {
    borrow: 'ยืม',
    return: 'คืน',
    exchange: 'แลกเปลี่ยน',
  };
  return texts[type] || 'ไม่ทราบประเภท';
}

// Role utilities
export function getRoleText(role: string): string {
  const texts: Record<string, string> = {
    admin: 'Admin (ผู้บริหาร)',
    cs: 'Customer Service (CS)',
    dentist: 'Dentist (ทันตแพทย์)',
    assistant: 'Dental Assistant (ผู้ช่วยทันตแพทย์)',
    stock_staff: 'Inventory Manager (ฝ่ายคลัง)',
  };
  return texts[role] || 'ไม่ทราบบทบาท';
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[0-9]{9,10}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Get today's date as YYYY-MM-DD in Thailand timezone (UTC+7)
export function getTodayDateString(): string {
  const now = new Date();
  // Use Intl to get components in Asia/Bangkok timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // returns YYYY-MM-DD in en-CA locale
}

// Calculate days until date
export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffTime = d.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Check if date is within range
export function isWithinDays(date: string | Date, days: number): boolean {
  const diff = daysUntil(date);
  return diff >= 0 && diff <= days;
}
