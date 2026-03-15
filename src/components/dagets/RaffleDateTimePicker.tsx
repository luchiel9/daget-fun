'use client';

import { useState, useRef, useEffect } from 'react';
import {
    toLocalDateString,
    formatDisplayDate,
    formatDisplayTime,
    getMonthName,
    getDaysInMonth,
    getFirstDayOfMonth,
} from './raffle-date-utils';

interface RaffleDateTimePickerProps {
    raffleDate: string; // YYYY-MM-DD
    raffleTime: string; // HH:MM
    onDateChange: (date: string) => void;
    onTimeChange: (time: string) => void;
    dateError?: string;
    timeError?: string;
}

/* ── Calendar Picker ── */

function CalendarPicker({
    value,
    onChange,
    onClose,
}: {
    value: string;
    onChange: (date: string) => void;
    onClose: () => void;
}) {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    const selected = value ? new Date(value + 'T00:00:00') : null;

    const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div
            ref={ref}
            className="absolute top-full left-0 mt-2 z-50 bg-card-dark border border-border-dark/60 rounded-xl shadow-primary p-3 w-[280px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors">
                    <span className="material-icons text-[18px]">chevron_left</span>
                </button>
                <span className="text-sm font-semibold text-text-primary">
                    {getMonthName(viewMonth)} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors">
                    <span className="material-icons text-[18px]">chevron_right</span>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-text-muted uppercase py-1">{d}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0">
                {cells.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} />;

                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isPast = dateStr < todayStr;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === value;

                    return (
                        <button
                            key={dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() => { onChange(dateStr); onClose(); }}
                            className={`
                                relative w-full aspect-square flex items-center justify-center rounded-lg text-xs font-mono transition-all
                                ${isPast ? 'text-text-muted/30 cursor-not-allowed' : 'hover:bg-primary/15 cursor-pointer'}
                                ${isSelected ? 'bg-primary text-white font-bold' : ''}
                                ${isToday && !isSelected ? 'text-primary font-bold' : ''}
                                ${!isSelected && !isPast && !isToday ? 'text-text-secondary' : ''}
                            `}
                        >
                            {day}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Time Picker ── */

function TimePicker({
    value,
    onChange,
    onClose,
}: {
    value: string;
    onChange: (time: string) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);

    const [hours, setHours] = useState(() => value ? parseInt(value.split(':')[0]) : new Date().getHours());
    const [minutes, setMinutes] = useState(() => value ? parseInt(value.split(':')[1]) : 0);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Scroll selected hour/minute into view
    useEffect(() => {
        hoursRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
        minutesRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
    }, []);

    const apply = (h: number, m: number) => {
        setHours(h);
        setMinutes(m);
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        onClose();
    };

    return (
        <div
            ref={ref}
            className="absolute top-full right-0 mt-2 z-50 bg-card-dark border border-border-dark/60 rounded-xl shadow-primary p-3 w-[220px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Pick a time</div>

            <div className="flex gap-2">
                {/* Hours column */}
                <div className="flex-1">
                    <div className="text-[10px] text-text-muted text-center mb-1">Hour</div>
                    <div ref={hoursRef} className="h-[180px] overflow-y-auto custom-scrollbar rounded-lg bg-background-dark/50 border border-border-dark/40">
                        {Array.from({ length: 24 }, (_, h) => {
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return (
                                <button
                                    key={h}
                                    type="button"
                                    data-selected={h === hours}
                                    onClick={() => apply(h, minutes)}
                                    className={`w-full px-2 py-1.5 text-xs font-mono text-center transition-colors ${
                                        h === hours
                                            ? 'bg-primary text-white'
                                            : 'text-text-secondary hover:bg-primary/10 hover:text-primary'
                                    }`}
                                >
                                    {h12} {ampm}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Minutes column */}
                <div className="flex-1">
                    <div className="text-[10px] text-text-muted text-center mb-1">Min</div>
                    <div ref={minutesRef} className="h-[180px] overflow-y-auto custom-scrollbar rounded-lg bg-background-dark/50 border border-border-dark/40">
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                            <button
                                key={m}
                                type="button"
                                data-selected={m === minutes}
                                onClick={() => apply(hours, m)}
                                className={`w-full px-2 py-1.5 text-xs font-mono text-center transition-colors ${
                                    m === minutes
                                        ? 'bg-primary text-white'
                                        : 'text-text-secondary hover:bg-primary/10 hover:text-primary'
                                }`}
                            >
                                :{String(m).padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Main Component ── */

export default function RaffleDateTimePicker({
    raffleDate,
    raffleTime,
    onDateChange,
    onTimeChange,
    dateError,
    timeError,
}: RaffleDateTimePickerProps) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const displayDate = raffleDate
        ? formatDisplayDate(new Date(raffleDate + 'T00:00:00'))
        : '';
    const displayTime = raffleTime
        ? formatDisplayTime(new Date(`2000-01-01T${raffleTime}`))
        : '';

    return (
        <div className="flex gap-3">
            {/* Date field */}
            <div className="flex-1 relative">
                <label className="text-xs text-text-muted">Date</label>
                <button
                    type="button"
                    onClick={() => { setShowCalendar(v => !v); setShowTimePicker(false); }}
                    className={`mt-1 w-full flex items-center gap-2 bg-background-dark/50 border rounded-xl p-3 text-left outline-none transition-colors ${
                        showCalendar
                            ? 'border-primary ring-1 ring-primary'
                            : dateError
                                ? 'border-red-500/60'
                                : 'border-border-dark/60 hover:border-primary/40'
                    }`}
                >
                    <span className="material-icons text-[16px] text-text-muted">calendar_today</span>
                    <span className={`flex-1 text-sm font-mono ${displayDate ? 'text-text-primary' : 'text-text-muted'}`}>
                        {displayDate || 'Pick a date'}
                    </span>
                </button>
                {showCalendar && (
                    <CalendarPicker
                        value={raffleDate}
                        onChange={(d) => { onDateChange(d); }}
                        onClose={() => setShowCalendar(false)}
                    />
                )}
                {dateError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="material-icons text-[10px]">error</span>
                        {dateError}
                    </p>
                )}
            </div>

            {/* Time field */}
            <div className="flex-1 relative">
                <label className="text-xs text-text-muted">Time</label>
                <button
                    type="button"
                    onClick={() => { setShowTimePicker(v => !v); setShowCalendar(false); }}
                    className={`mt-1 w-full flex items-center gap-2 bg-background-dark/50 border rounded-xl p-3 text-left outline-none transition-colors ${
                        showTimePicker
                            ? 'border-primary ring-1 ring-primary'
                            : timeError
                                ? 'border-red-500/60'
                                : 'border-border-dark/60 hover:border-primary/40'
                    }`}
                >
                    <span className="material-icons text-[16px] text-text-muted">schedule</span>
                    <span className={`flex-1 text-sm font-mono ${displayTime ? 'text-text-primary' : 'text-text-muted'}`}>
                        {displayTime || 'Pick a time'}
                    </span>
                </button>
                {showTimePicker && (
                    <TimePicker
                        value={raffleTime}
                        onChange={(t) => { onTimeChange(t); }}
                        onClose={() => setShowTimePicker(false)}
                    />
                )}
                {timeError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="material-icons text-[10px]">error</span>
                        {timeError}
                    </p>
                )}
            </div>
        </div>
    );
}
