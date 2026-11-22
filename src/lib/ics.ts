import { APP_NAME } from '../config';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function nextFriday(from = new Date()): string {
  const d = new Date(from);
  const add = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildIcs(dateISO: string, title: string, description: string, now = new Date(), monthly = false, url?: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME}//One step//EN`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${stamp}-${ymd(start)}@${APP_NAME.toLowerCase()}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    ...(monthly ? ['RRULE:FREQ=MONTHLY'] : []),
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(url ? `${description} ${url}` : description)}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:PT9H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

// The same reminder as a Google Calendar link: one tap on a phone, no file to
// open. An all-day event on that date, repeating monthly when asked.
export function googleCalendarUrl(dateISO: string, title: string, details: string, monthly = false): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, details, dates: `${ymd(start)}/${ymd(end)}` });
  if (monthly) p.set('recur', 'RRULE:FREQ=MONTHLY');
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
