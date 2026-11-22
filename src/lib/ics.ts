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

export function todayISO(from = new Date()): string {
  return `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
}

// A plain monthly repeat skips months without that day. From the 29th on,
// use that day or the last day of a shorter month.
export function monthlyRule(dateISO: string): string {
  const day = Number(dateISO.split('-')[2]);
  if (day <= 28) return 'RRULE:FREQ=MONTHLY';
  const days = Array.from({ length: day - 27 }, (_, i) => 28 + i).join(',');
  return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${days};BYSETPOS=-1`;
}

// Calendar files limit lines to 75 bytes; longer ones continue after a space.
function fold(line: string): string {
  const bytes = (c: string) => new TextEncoder().encode(c).length;
  const out: string[] = [];
  let part = '';
  let size = 0;
  for (const c of line) {
    const n = bytes(c);
    if (size + n > (out.length ? 74 : 75)) {
      out.push(part);
      part = '';
      size = 0;
    }
    part += c;
    size += n;
  }
  out.push(part);
  return out.join('\r\n ');
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
    ...(monthly ? [monthlyRule(dateISO)] : []),
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
  ]
    .map(fold)
    .join('\r\n');
}

// The same reminder as a Google Calendar link: one tap on a phone, no file to
// open. An all-day event on that date, repeating monthly when asked. It goes
// through Google sign-in because a signed-out visit to the event page lands on
// a marketing page and loses the event; signed-in people pass straight through.
export function googleCalendarUrl(dateISO: string, title: string, details: string, monthly = false): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, details, dates: `${ymd(start)}/${ymd(end)}` });
  if (monthly) p.set('recur', monthlyRule(dateISO));
  const event = `https://calendar.google.com/calendar/render?${p.toString()}`;
  return `https://accounts.google.com/ServiceLogin?service=cl&continue=${encodeURIComponent(event)}`;
}
