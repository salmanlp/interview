import { useEffect, useRef, useState } from 'react';
import { cx, formatClock } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { timerState } from '@/lib/interview';

interface InterviewTimerProps {
  elapsedMs: number;
  durationMinutes: number;
  paused: boolean;
  warningMinutes: number;
  criticalMinutes: number;
  onTick: (elapsedMs: number) => void;
  onTogglePause: () => void;
  readOnly?: boolean;
}

/**
 * Counts up, keeps counting past the scheduled duration, and changes state at
 * the configured warning thresholds. Ticking is driven from wall-clock time so
 * a backgrounded tab does not lose seconds.
 */
export function InterviewTimer({
  elapsedMs,
  durationMinutes,
  paused,
  warningMinutes,
  criticalMinutes,
  onTick,
  onTogglePause,
  readOnly,
}: InterviewTimerProps) {
  const [display, setDisplay] = useState(elapsedMs);
  const baseRef = useRef({ elapsed: elapsedMs, at: Date.now() });
  const announcedRef = useRef<string>('');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    baseRef.current = { elapsed: elapsedMs, at: Date.now() };
    setDisplay(elapsedMs);
  }, [elapsedMs, paused]);

  useEffect(() => {
    if (paused || readOnly) return;
    const id = setInterval(() => {
      const next = baseRef.current.elapsed + (Date.now() - baseRef.current.at);
      setDisplay(next);
      onTick(next);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, readOnly, onTick]);

  const state = timerState(display, durationMinutes, { warningMinutes, criticalMinutes });
  const remainingMs = durationMinutes * 60_000 - display;

  useEffect(() => {
    if (state === announcedRef.current || readOnly) return;
    announcedRef.current = state;
    if (state === 'warning') setAnnouncement(`${warningMinutes} minutes remaining.`);
    else if (state === 'critical') setAnnouncement(`${criticalMinutes} minute remaining.`);
    else if (state === 'overtime') setAnnouncement('Scheduled time is up. The timer is now counting overtime.');
    else setAnnouncement('');
  }, [state, warningMinutes, criticalMinutes, readOnly]);

  const styles = {
    normal: 'border-line bg-surface-2 text-ink',
    warning: 'border-warn/40 bg-warn-soft text-warn',
    critical: 'border-danger/40 bg-danger-soft text-danger',
    overtime: 'border-danger/50 bg-danger-soft text-danger',
  }[state];

  const label =
    state === 'overtime'
      ? `Overtime ${formatClock(-remainingMs)}`
      : state === 'critical'
        ? 'Under 1 min left'
        : state === 'warning'
          ? `${Math.ceil(remainingMs / 60000)} min left`
          : `of ${durationMinutes} min`;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cx(
          'flex items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-colors duration-300',
          styles,
          state === 'critical' && !paused && 'animate-pulse-soft',
        )}
      >
        <Icon name="clock" size={15} className="shrink-0 opacity-80" />
        <div className="leading-none">
          <p className="text-[17px] font-semibold tabular tracking-tight">
            {formatClock(display)}
          </p>
          <p className="mt-0.5 text-[10.5px] font-medium opacity-80 tabular">
            {paused ? 'Paused' : label}
          </p>
        </div>
      </div>

      {!readOnly ? (
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? 'Resume timer' : 'Pause timer'}
          title={paused ? 'Resume timer (Space)' : 'Pause timer (Space)'}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2"
        >
          <Icon name={paused ? 'play' : 'pause'} size={16} />
        </button>
      ) : null}

      <span className="sr-only" role="status" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}
