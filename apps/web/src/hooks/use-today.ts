import { useEffect, useState } from 'react';
import { toDateKey } from '@/lib/dates';

const CHECK_INTERVAL_MS = 60_000;

export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const update = () => setToday(toDateKey(new Date()));
    const timer = window.setInterval(update, CHECK_INTERVAL_MS);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);

  return today;
}
