'use client';

import React from 'react';

/* ─── Glass Card ─── */
export function GlassCard({
    children,
    className = '',
    gradient = false,
    hover = false,
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
    hover?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`
        rounded-xl border border-border-dark/40
        bg-[rgba(255,255,255,0.03)] backdrop-blur-md
        ${gradient ? 'bg-gradient-to-br from-surface-alt/60 to-surface/40' : ''}
        ${hover ? 'glass-card-hover transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/15' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
}

/* ─── Status Chip ─── */
export function StatusChip({ status }: { status: string }) {
    const labels: Record<string, string> = {
        active: 'Active',
        stopped: 'Stopped',
        closed: 'Closed',
        created: 'Queued',
        submitted: 'Processing',
        confirmed: 'Confirmed',
        failed_retryable: 'Retrying',
        failed_permanent: 'Failed',
        released: 'Released',
    };

    return (
        <span className={`status-${status} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {labels[status] || status}
        </span>
    );
}

/* ─── Token Card ─── */
export function TokenCard({
    symbol,
    balance,
    icon,
}: {
    symbol: string;
    balance: string;
    icon?: string;
}) {
    return (
        <GlassCard className="p-4 flex items-center gap-4" hover>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary">
                {icon || symbol.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-text-secondary font-medium uppercase tracking-wider">{symbol}</div>
                <div className="text-xl font-semibold text-text-primary tabular-nums">{balance}</div>
            </div>
        </GlassCard>
    );
}

/* ─── Button ─── */
export function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
}: {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
    className?: string;
}) {
    const variants = {
        primary: 'bg-primary hover:bg-primary/85 text-white shadow-lg shadow-primary/20',
        secondary: 'bg-surface-alt border border-border-dark/60 hover:border-primary/30 text-text-primary',
        danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
        ghost: 'bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-7 py-3.5 text-base',
    };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}

/* ─── Spinner ─── */
export function Spinner({
    size = 'md',
    className = '',
}: {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}) {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
    };

    return (
        <svg
            className={`animate-spin text-primary ${sizes[size]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
        </svg>
    );
}

/* ─── Input Field ─── */
export function Input({
    label,
    error,
    ...props
}: {
    label?: string;
    error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
            <input
                {...props}
                className={`
          w-full px-4 py-3.5 rounded-xl border
          bg-background-dark/50
          text-text-primary placeholder:text-text-secondary/50
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
          transition-colors
          ${error ? 'border-red-500/50' : 'border-border-dark/60'}
          ${props.className || ''}
        `}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

/* ─── Select ─── */
export function Select({
    label,
    error,
    options,
    ...props
}: {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
            <select
                {...props}
                className={`
          w-full px-4 py-3.5 rounded-xl border bg-background-dark/50
          text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30
          ${error ? 'border-red-500/50' : 'border-border-dark/60'}
          ${props.className || ''}
        `}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

/* ─── Searchable Select ─── */
export function SearchableSelect({
    label,
    error,
    options,
    value,
    onChange,
    placeholder = 'Select an option...',
    className = '',
}: {
    label?: string;
    error?: string;
    options: { value: string; label: string; icon?: string | null }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = React.useMemo(() => {
        return options.filter(opt =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const selectedOption = options.find(opt => opt.value === value);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
            {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) setSearch('');
                    }}
                    className={`
                        w-full px-4 py-3.5 rounded-xl border bg-background-dark/50
                        text-left flex items-center justify-between
                        text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30
                        ${error ? 'border-red-500/50' : 'border-border-dark/60'}
                        ${isOpen ? 'ring-2 ring-primary/30 border-primary/50' : ''}
                    `}
                >
                    <span className={`block truncate ${!selectedOption ? 'text-text-secondary/50' : ''}`}>
                        {selectedOption ? (
                            <div className="flex items-center gap-2">
                                {selectedOption.icon && (
                                    <img
                                        src={selectedOption.icon}
                                        alt=""
                                        className="w-5 h-5 rounded-full object-cover bg-background-dark"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                                {selectedOption.label}
                            </div>
                        ) : placeholder}
                    </span>
                    <span className="material-icons text-text-secondary">expand_more</span>
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-surface-alt border border-border-dark/60 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 border-b border-border-dark/40 sticky top-0 bg-surface-alt z-10">
                            <div className="relative">
                                <span className="material-icons absolute left-3 top-2.5 text-text-secondary text-sm">search</span>
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 bg-background-dark/50 border border-border-dark/40 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`
                                            w-full px-4 py-2.5 text-left text-sm rounded-lg flex items-center gap-2 transition-colors
                                            ${opt.value === value ? 'bg-primary/10 text-primary font-medium' : 'text-text-primary hover:bg-white/5'}
                                        `}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        {opt.icon ? (
                                            <img
                                                src={opt.icon}
                                                alt=""
                                                className="w-6 h-6 rounded-full object-cover bg-background-dark"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-[10px] font-bold text-text-secondary border border-white/10">
                                                {opt.label.charAt(0)}
                                            </div>
                                        )}
                                        <span className="truncate">{opt.label}</span>
                                        {opt.value === value && <span className="material-icons text-xs ml-auto">check</span>}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-text-secondary">
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

/* ─── Modal ─── */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message?: React.ReactNode;
    children?: React.ReactNode;
    icon?: string;
    iconColor?: string;
    iconBg?: string;
    borderColor?: string;
    primaryAction?: {
        label: string;
        onClick: () => void;
        loading?: boolean;
        variant?: 'primary' | 'danger' | 'secondary';
        disabled?: boolean;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
        variant?: 'ghost' | 'secondary';
    };
}

export function Modal({
    isOpen,
    onClose,
    title,
    message,
    children,
    icon = 'warning',
    iconColor = 'text-amber-400',
    iconBg = 'bg-amber-500/10',
    borderColor = 'border-amber-500/20',
    primaryAction,
    secondaryAction,
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl border ${borderColor} bg-card-dark p-6 shadow-2xl scale-100 transition-transform`}>
                <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-icons ${iconColor} text-2xl`}>{icon}</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
                        {message && (typeof message === 'string' ? <p className="text-sm text-text-secondary leading-relaxed">{message}</p> : message)}
                    </div>
                </div>

                {children && <div className="mb-6">{children}</div>}

                <div className="flex gap-3 justify-end mt-6">
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                    {primaryAction && (
                        <Button
                            variant={primaryAction.variant || 'primary'}
                            onClick={primaryAction.onClick}
                            loading={primaryAction.loading}
                            disabled={primaryAction.disabled}
                            className="text-sm"
                        >
                            {primaryAction.label}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Security Modal (Export Key / Regenerate) ─── */
export function SecurityModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    loading = false,
    requireCheckbox = false,
    checkboxLabel = 'I understand',
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    requireCheckbox?: boolean;
    checkboxLabel?: string;
}) {
    const [checked, setChecked] = React.useState(false);

    // Reset checkbox when modal opens
    React.useEffect(() => {
        if (isOpen) setChecked(false);
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            message={message}
            icon="warning"
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
            borderColor="border-red-500/20"
            primaryAction={{
                label: confirmLabel,
                onClick: onConfirm,
                loading,
                variant: 'danger',
                disabled: requireCheckbox && !checked,
            }}
            secondaryAction={{
                label: 'Cancel',
                onClick: onClose,
            }}
        >
            {requireCheckbox && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center mt-0.5">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                            />
                            <div className="w-5 h-5 border-2 border-text-secondary rounded bg-transparent peer-checked:bg-red-500 peer-checked:border-red-500 transition-all"></div>
                            <span className="material-icons absolute top-0 left-0 text-[18px] text-white opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                        </div>
                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors select-none">
                            {checkboxLabel}
                        </span>
                    </label>
                </div>
            )}
        </Modal>
    );
}

/* ─── Empty State ─── */
export function EmptyState({
    icon = 'inbox',
    title,
    description,
    action,
}: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-text-secondary/30 mb-4">{icon}</span>
            <h3 className="text-lg font-medium text-text-secondary mb-1">{title}</h3>
            {description && <p className="text-sm text-text-secondary/60 max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
