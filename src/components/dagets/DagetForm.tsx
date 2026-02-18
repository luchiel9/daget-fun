'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, Button, Input, Select, SearchableSelect, Modal } from '@/components/ui';
import TipTapEditor from '../ui/TipTapEditor';

import { simulateRandomClaims } from '@/lib/random-distribution';

export interface FormValues {
    name: string;
    message_html: string;
    discord_guild_id: string;
    discord_guild_name: string;
    discord_guild_icon: string | null;
    required_role_ids: string;
    token_symbol: string;
    amount_display: string;
    total_winners: string;
    daget_type: string;
    random_min_percent: string;
    random_max_percent: string;
    required_roles?: { id: string, name: string, color?: number }[];
}

const RANDOM_PROFILES = [
    {
        id: 'balanced',
        name: 'Balanced',
        minPercent: 10,
        maxPercent: 50,
        icon: 'balance',
        description: 'Consistent rewards. Everyone gets roughly the same amount, with just enough difference to keep it fun.'
    },
    {
        id: 'spicy',
        name: 'Spicy',
        minPercent: 10,
        maxPercent: 75,
        icon: 'local_fire_department',
        description: 'Balanced excitement. Moderate variance allows for lucky winners to claim significantly more than average.'
    },
    {
        id: 'degen',
        name: 'Degen',
        minPercent: 10,
        maxPercent: 95,
        icon: 'rocket_launch',
        description: 'High stakes chaos. Maximum variance means some users win massive jackpots while others get dust. 1000% fun.'
    }
];

interface DagetFormProps {
    mode: 'create' | 'edit';
    initialValues?: Partial<FormValues>;
    claimsCount?: number;
    onSubmit: (values: FormValues) => Promise<void>;
    isLoading?: boolean;
    error?: string | null;
}

export default function DagetForm({ mode, initialValues, claimsCount = 0, onSubmit, isLoading = false, error: propError }: DagetFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    // Combine loading states
    const isSubmitting = loading || isLoading;

    const [error, setError] = useState<string | null>(propError || null);

    // Update local error when prop error changes
    useEffect(() => {
        if (propError) setError(propError);
    }, [propError]);

    const [balances, setBalances] = useState<{ sol: string, usdc: string, usdt: string } | null>(null);
    const [solPrice, setSolPrice] = useState<number>(0);
    const [form, setForm] = useState<FormValues>({
        name: '',
        message_html: '',
        discord_guild_id: '',
        discord_guild_name: '',
        discord_guild_icon: null,
        required_role_ids: '',
        token_symbol: '',
        amount_display: '',
        total_winners: '',
        daget_type: 'fixed',
        random_min_percent: '10', // Default to Spicy (Middle)
        random_max_percent: '75', // Default to Spicy (Middle)
        ...initialValues,
    });

    const [guilds, setGuilds] = useState<{ id: string, name: string, icon: string | null }[]>([]);
    const [roles, setRoles] = useState<{ id: string, name: string, color: number, managed: boolean }[]>([]);
    const [loadingGuilds, setLoadingGuilds] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [roleError, setRoleError] = useState<string | null>(null);
    const [botInviteLink, setBotInviteLink] = useState<string | null>(null);
    const [discordAuthError, setDiscordAuthError] = useState(false);
    const [manualRoles, setManualRoles] = useState<{ name: string, id: string }[]>([{ name: '', id: '' }]);

    // Field validation errors
    const [validationErrors, setValidationErrors] = useState<{
        token_symbol?: string;
        discord_guild_id?: string;
        required_role_ids?: string;
        manual_roles?: { [key: number]: { name?: string; id?: string } };
    }>({});

    // Effect to load roles if initialValues has guild ID (Edit mode)
    useEffect(() => {
        if (mode === 'edit' && initialValues?.discord_guild_id) {
            // In edit mode we likely want to load existing roles from DB or fetch if possible
            // If initialValues provided roles structure we can use that for display
            // But for validation/editing we should try to fetch live roles if possible
            // For now, let's just create roles from existing required_roles if provided?
            // But better to fetch live from Discord if we have the guild ID.
            if (initialValues.required_roles) {
                // Map to format
                setRoles(initialValues.required_roles.map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color || 0,
                    managed: false
                })));
            }

            // Also try to fetch fresh roles in background?
            fetchRoles(initialValues.discord_guild_id);
        }
    }, [mode, initialValues]);

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await fetch('/api/wallet/balances');
                if (res.ok) {
                    const data = await res.json();
                    setBalances({
                        sol: data.sol,
                        usdc: data.usdc,
                        usdt: data.usdt,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch balances', error);
            }
        };

        const fetchSolPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await res.json();
                setSolPrice(data.solana?.usd || 0);
            } catch (error) {
                console.error('Failed to fetch SOL price', error);
            }
        };

        fetchBalances();
        fetchSolPrice();
        handleSyncServers();

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'DISCORD_LOGIN_SUCCESS') {
                handleSyncServers();
                setDiscordAuthError(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Validation functions
    const validateTokenSymbol = (value: string) => {
        if (!value || (value !== 'USDC' && value !== 'USDT')) {
            return 'Please select a token (USDC or USDT)';
        }
        return null;
    };

    const validateDiscordGuild = (value: string) => {
        if (!value || value.trim() === '') {
            return 'Discord server is required';
        }
        return null;
    };

    const validateRoles = (roleIds: string, manualRolesData: { name: string, id: string }[]) => {
        const roleIdList = roleIds.split(',').map(s => s.trim()).filter(Boolean);

        // Check if using fetched roles (roles.length > 0) or manual roles
        if (roles.length > 0) {
            // Fetched roles - at least one must be selected
            if (roleIdList.length === 0) {
                return 'Please select at least one role';
            }
        } else {
            // Manual roles - at least one complete role entry required
            const completeRoles = manualRolesData.filter(r => r.id.trim() && r.name.trim());
            if (completeRoles.length === 0) {
                return 'Please add at least one role with both ID and name';
            }
        }
        return null;
    };

    const validateManualRole = (role: { name: string, id: string }, index: number) => {
        const errors: { name?: string; id?: string } = {};

        // Only validate if at least one field is filled
        const hasName = role.name.trim().length > 0;
        const hasId = role.id.trim().length > 0;

        if (hasName || hasId) {
            if (!hasName) {
                errors.name = 'Role name is required';
            }
            if (!hasId) {
                errors.id = 'Role ID is required';
            }
        }

        return Object.keys(errors).length > 0 ? errors : null;
    };

    const updateForm = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));

        // Real-time validation
        const newErrors = { ...validationErrors };

        if (key === 'token_symbol') {
            const error = validateTokenSymbol(value);
            if (error) {
                newErrors.token_symbol = error;
            } else {
                delete newErrors.token_symbol;
            }
        }

        if (key === 'discord_guild_id') {
            const error = validateDiscordGuild(value);
            if (error) {
                newErrors.discord_guild_id = error;
            } else {
                delete newErrors.discord_guild_id;
            }
        }

        if (key === 'required_role_ids') {
            setRoleError(null);
            const error = validateRoles(value, manualRoles);
            if (error) {
                newErrors.required_role_ids = error;
            } else {
                delete newErrors.required_role_ids;
            }
        }

        setValidationErrors(newErrors);
    };

    const handleMaxClick = () => {
        if (!balances || !form.token_symbol) return;

        let maxAmount = 0;

        if (form.token_symbol === 'USDC') {
            maxAmount = parseFloat(balances.usdc) || 0;
        } else if (form.token_symbol === 'USDT') {
            maxAmount = parseFloat(balances.usdt) || 0;
        }

        const displayAmount = Math.max(0, maxAmount).toFixed(2); // Prevent -0.00
        updateForm('amount_display', displayAmount);
    };

    const handleSyncServers = async () => {
        setLoadingGuilds(true);
        setDiscordAuthError(false);
        try {
            const res = await fetch('/api/discord/guilds');
            if (res.ok) {
                const data = await res.json();
                setGuilds(data);
            } else {
                const err = await res.json();
                if (err.error?.message?.includes('Discord account not connected or session expired')) {
                    setDiscordAuthError(true);
                }
                console.error('Failed to sync servers', err);
            }
        } catch (error) {
            console.error('Failed to sync servers', error);
        } finally {
            setLoadingGuilds(false);
        }
    };

    const handleDiscordLogin = () => {
        const usePopup = process.env.NEXT_PUBLIC_DISCORD_AUTH_POP_UP === '1';

        if (!usePopup) {
            window.location.href = '/api/discord/auth?return_to=/create';
            return;
        }

        const popup = window.open(
            '/api/discord/auth?return_to=/create&popup=1',
            'Discord Login',
            'width=500,height=800,left=200,top=200',
        );
        if (popup) {
            const onMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'DISCORD_LOGIN_SUCCESS') {
                    window.removeEventListener('message', onMessage);
                    handleSyncServers();
                }
            };
            window.addEventListener('message', onMessage);
        }
    };

    const fetchRoles = async (guildId: string) => {
        setLoadingRoles(true);
        try {
            const res = await fetch(`/api/discord/roles?guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            } else {
                const err = await res.json();
                const errorCode = err.error?.message;

                if (errorCode === 'BOT_NOT_IN_GUILD') {
                    setRoleError('Bot is not in this server. You can manage roles manually.');
                    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
                    if (clientId) {
                        const link = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=268435456&scope=bot`;
                        setBotInviteLink(link);
                        setRoleError('BOT_NOT_IN_GUILD'); // Use code to trigger custom UI
                    } else {
                        setRoleError('Bot not in server and Client ID missing for invite. Managing roles manually.');
                    }

                    // Fallback to manual roles if in edit mode and this is the original guild
                    if (mode === 'edit' && initialValues?.discord_guild_id === guildId && initialValues.required_roles) {
                        setManualRoles(initialValues.required_roles.map(r => ({ name: r.name, id: r.id })));
                        setRoles([]); // Clear roles to trigger manual mode UI
                    }
                } else {
                    setRoleError(err.error?.message || 'Failed to fetch roles.');
                }
            }
        } catch (error) {
            console.error('Failed to fetch roles', error);
            setRoleError('Network error while fetching roles.');
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleGuildChange = async (guildId: string) => {
        const selectedGuild = guilds.find(g => g.id === guildId);
        updateForm('discord_guild_id', guildId);
        if (selectedGuild) {
            updateForm('discord_guild_name', selectedGuild.name);
            updateForm('discord_guild_icon', selectedGuild.icon);
        } else {
            updateForm('discord_guild_name', '');
            updateForm('discord_guild_icon', null);
        }

        // Reset roles when guild changes
        updateForm('required_role_ids', '');
        setRoles([]);
        setManualRoles([{ name: '', id: '' }]);
        setRoleError(null);
        setBotInviteLink(null);

        // Clear role validation errors when guild changes
        const newErrors = { ...validationErrors };
        delete newErrors.required_role_ids;
        delete newErrors.manual_roles;
        setValidationErrors(newErrors);

        if (guildId) {
            fetchRoles(guildId);
        }
    };

    const toggleRole = (roleId: string) => {
        const currentIds = form.required_role_ids.split(',').map(s => s.trim()).filter(Boolean);
        let newIds;
        if (currentIds.includes(roleId)) {
            newIds = currentIds.filter(id => id !== roleId);
        } else {
            newIds = [...currentIds, roleId];
        }
        const newRoleIds = newIds.join(',');
        setForm(prev => ({ ...prev, required_role_ids: newRoleIds }));

        // Validate roles
        const newErrors = { ...validationErrors };
        const error = validateRoles(newRoleIds, manualRoles);
        if (error) {
            newErrors.required_role_ids = error;
        } else {
            delete newErrors.required_role_ids;
        }
        setValidationErrors(newErrors);
    };

    const addManualRole = () => {
        setManualRoles([...manualRoles, { name: '', id: '' }]);
    };

    const removeManualRole = (index: number) => {
        const newRoles = [...manualRoles];
        newRoles.splice(index, 1);
        setManualRoles(newRoles);

        // Update validation errors - remove the deleted role's errors and reindex
        const newErrors = { ...validationErrors };
        if (newErrors.manual_roles) {
            const reindexedErrors: { [key: number]: { name?: string; id?: string } } = {};
            Object.keys(newErrors.manual_roles).forEach((key) => {
                const oldIndex = parseInt(key);
                if (oldIndex < index) {
                    reindexedErrors[oldIndex] = newErrors.manual_roles![oldIndex];
                } else if (oldIndex > index) {
                    reindexedErrors[oldIndex - 1] = newErrors.manual_roles![oldIndex];
                }
            });

            if (Object.keys(reindexedErrors).length > 0) {
                newErrors.manual_roles = reindexedErrors;
            } else {
                delete newErrors.manual_roles;
            }
        }

        // Re-validate overall roles requirement
        const ids = newRoles.map(r => r.id.trim()).filter(Boolean).join(',');
        const rolesError = validateRoles(ids, newRoles);
        if (rolesError) {
            newErrors.required_role_ids = rolesError;
        } else {
            delete newErrors.required_role_ids;
        }

        setValidationErrors(newErrors);
    };

    const updateManualRole = (index: number, field: 'name' | 'id', value: string) => {
        const newRoles = [...manualRoles];
        newRoles[index][field] = value;
        setManualRoles(newRoles);

        // Update form.required_role_ids for live preview/validation
        const ids = newRoles.map(r => r.id.trim()).filter(Boolean).join(',');
        updateForm('required_role_ids', ids);

        // Validate this specific manual role
        const newErrors = { ...validationErrors };
        if (!newErrors.manual_roles) {
            newErrors.manual_roles = {};
        }

        const roleErrors = validateManualRole(newRoles[index], index);
        if (roleErrors) {
            newErrors.manual_roles[index] = roleErrors;
        } else {
            delete newErrors.manual_roles[index];
            // Clean up if no manual role errors remain
            if (Object.keys(newErrors.manual_roles).length === 0) {
                delete newErrors.manual_roles;
            }
        }

        // Also validate the overall roles requirement
        const rolesError = validateRoles(ids, newRoles);
        if (rolesError) {
            newErrors.required_role_ids = rolesError;
        } else {
            delete newErrors.required_role_ids;
        }

        setValidationErrors(newErrors);
    };

    const updateRandomProfile = (min: number, max: number) => {
        setForm(prev => ({
            ...prev,
            random_min_percent: min.toString(),
            random_max_percent: max.toString()
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Run all validations
            const errors: typeof validationErrors = {};

            // Validate token
            const tokenError = validateTokenSymbol(form.token_symbol);
            if (tokenError) {
                errors.token_symbol = tokenError;
            }

            // Validate Discord guild
            const guildError = validateDiscordGuild(form.discord_guild_id);
            if (guildError) {
                errors.discord_guild_id = guildError;
            }

            // Validate Random Mode settings
            if (form.daget_type === 'random') {
                if (!form.random_min_percent || !form.random_max_percent) {
                    setError('Please select a random distribution profile (Balanced, Spicy, or Degen).');
                    setLoading(false);
                    return;
                }
            }

            // Validate roles
            const rolesError = validateRoles(form.required_role_ids, manualRoles);
            if (rolesError) {
                errors.required_role_ids = rolesError;
            }

            // Validate manual roles if using them
            if (roles.length === 0) {
                const manualRoleErrors: { [key: number]: { name?: string; id?: string } } = {};
                manualRoles.forEach((role, index) => {
                    const roleError = validateManualRole(role, index);
                    if (roleError) {
                        manualRoleErrors[index] = roleError;
                    }
                });
                if (Object.keys(manualRoleErrors).length > 0) {
                    errors.manual_roles = manualRoleErrors;
                }
            }

            // If there are validation errors, show them and stop submission
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setError('Please fix the validation errors before submitting');
                setLoading(false);
                return;
            }

            // Construct required_roles payload
            const roleIds = form.required_role_ids.split(',').map((s) => s.trim()).filter(Boolean);
            let finalRoles: { id: string, name: string, color?: number }[] = [];

            if (roles.length > 0) {
                finalRoles = roles
                    .filter(r => roleIds.includes(r.id))
                    .map(r => ({ id: r.id, name: r.name, color: r.color }));
            } else {
                // Use manual roles
                finalRoles = manualRoles
                    .filter(r => r.id.trim() && r.name.trim())
                    .map(r => ({ id: r.id.trim(), name: r.name.trim(), color: 0 }));
            }

            await onSubmit({
                ...form,
                required_roles: finalRoles
            });
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Live Summary Calculations
    const estimatedClaim = useMemo(() => {
        const amount = parseFloat(form.amount_display) || 0;
        const winners = parseInt(form.total_winners) || 1;

        if (form.daget_type === 'fixed') {
            if (winners <= 0) return '0.00';
            return (amount / winners).toFixed(2);
        } else {
            // Random Mode Simulation
            const minPercent = parseFloat(form.random_min_percent) || 10;
            const maxPercent = parseFloat(form.random_max_percent) || 75;

            // If we don't have valid inputs yet
            if (amount <= 0 || winners <= 0) return '0.00 - 0.00';

            const result = simulateRandomClaims(amount, winners, minPercent, maxPercent);
            return `${result.min} - ${result.max}`;
        }
    }, [form.amount_display, form.total_winners, form.daget_type, form.random_min_percent, form.random_max_percent]);

    const totalToFund = useMemo(() => {
        const amount = parseFloat(form.amount_display) || 0;
        return amount.toFixed(2);
    }, [form.amount_display]);

    // Gas estimation: base tx fee * total winners * 1.5 buffer
    const estimatedGas = useMemo(() => {
        const winners = parseInt(form.total_winners) || 0;
        const baseTxFee = 0.000005; // 5000 lamports ≈ 0.000005 SOL per transaction
        const gasNeeded = winners * baseTxFee * 1.5; // 150% buffer
        return gasNeeded.toFixed(6);
    }, [form.total_winners]);

    const estimatedGasUsd = useMemo(() => {
        if (solPrice === 0) return '0.00';
        const gasAmount = parseFloat(estimatedGas);
        return (gasAmount * solPrice).toFixed(2);
    }, [estimatedGas, solPrice]);

    // Balance validations
    const tokenBalanceCheck = useMemo(() => {
        if (!balances || !form.token_symbol) return { hasEnough: false, message: '', color: '' };

        const amount = parseFloat(form.amount_display) || 0;
        let balance = 0;
        let tokenName = '';

        if (form.token_symbol === 'USDC') {
            balance = parseFloat(balances.usdc);
            tokenName = 'USDC';
        } else if (form.token_symbol === 'USDT') {
            balance = parseFloat(balances.usdt);
            tokenName = 'USDT';
        }

        const hasEnough = balance >= amount;
        const message = hasEnough
            ? `You have enough balance (${balance.toFixed(2)} ${tokenName})`
            : `Not enough balance. You have ${balance.toFixed(2)} ${tokenName}, need ${amount.toFixed(2)} ${tokenName}`;
        const color = hasEnough ? 'text-green-500' : 'text-red-500';

        return { hasEnough, message, color };
    }, [balances, form.amount_display, form.token_symbol]);

    const gasBalanceCheck = useMemo(() => {
        if (!balances) return { hasEnough: false, message: '', color: '' };

        const solBalance = parseFloat(balances.sol);
        const gasNeeded = parseFloat(estimatedGas);
        const hasEnough = solBalance >= gasNeeded;

        const usdValue = solPrice > 0 ? (solBalance * solPrice).toFixed(2) : '0.00';
        const message = hasEnough
            ? `You have enough balance (${solBalance.toFixed(6)} SOL ≈ $${usdValue})`
            : `Not enough SOL for gas. You have ${solBalance.toFixed(6)} SOL, need ${gasNeeded} SOL`;
        const color = hasEnough ? 'text-green-500' : 'text-red-500';

        return { hasEnough, message, color };
    }, [balances, estimatedGas, solPrice]);

    const canSubmit = tokenBalanceCheck.hasEnough && gasBalanceCheck.hasEnough;

    const hasRoles = form.required_role_ids.trim().length > 0;
    const hasGuild = form.discord_guild_id.trim().length > 0;

    const currentBalance = useMemo(() => {
        if (!balances || !form.token_symbol) return '-';
        if (form.token_symbol === 'USDC') return `${balances.usdc} USDC`;
        if (form.token_symbol === 'USDT') return `${balances.usdt} USDT`;
        return '-';
    }, [balances, form.token_symbol]);

    const isRewardPoolDisabled = claimsCount > 0;

    return (
        <div className="flex-1 w-full h-full">
            <form onSubmit={handleSubmit} className="h-full">
                {isRewardPoolDisabled && (
                    <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-start gap-3">
                        <span className="material-icons text-sm mt-0.5">warning</span>
                        <div className="text-sm">
                            <p className="font-bold">Reward Pool Locked</p>
                            <p className="opacity-80">Claims have already started. You cannot modify the amount, winners, or token type.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8 h-full">
                    <div className="flex-1 space-y-8 pb-20"> {/* pb-20 for scroll space */}
                        {/* Step Indicator - Only for create mode? Or adapt for edit? Let's keep it for create mostly */}
                        {mode === 'create' && (
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex items-center gap-2 group cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">1</div>
                                    <span className="font-medium text-primary">Details</span>
                                </div>
                                <div className="h-px w-8 bg-border-dark/60"></div>
                                <div className="flex items-center gap-2 group cursor-pointer opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted font-bold text-sm">2</div>
                                    <span className="font-medium">Gating</span>
                                </div>
                                <div className="h-px w-8 bg-border-dark/60"></div>
                                <div className="flex items-center gap-2 group cursor-pointer opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted font-bold text-sm">3</div>
                                    <span className="font-medium">Rewards</span>
                                </div>
                            </div>
                        )}

                        <section className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold mb-2 text-text-primary">
                                    {mode === 'create' ? 'Create New Daget' : 'Edit Daget'}
                                </h1>
                                <p className="text-text-secondary">
                                    {mode === 'create' ? 'Launch a community-gated giveaway on Solana in minutes.' : 'Update your giveaway details and requirements.'}
                                </p>
                            </div>

                            <GlassCard className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Input
                                        label="Daget Name"
                                        placeholder="e.g. Genesis Community Drop"
                                        required
                                        maxLength={120}
                                        value={form.name}
                                        onChange={(e) => updateForm('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Message / Description</label>
                                    <div className="bg-background-dark/50 border border-border-dark/60 rounded-xl overflow-hidden min-h-[200px]">
                                        <TipTapEditor
                                            value={form.message_html}
                                            onChange={(html) => updateForm('message_html', html)}
                                            placeholder="Share why you're hosting this giveaway..."
                                            className="w-full h-full"
                                        />
                                    </div>
                                </div>
                            </GlassCard>
                        </section>

                        <section className="space-y-6 pt-4 border-t border-border-dark/60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                                        <span className="material-icons text-[#5865F2]">hub</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Community Gating</h2>
                                        <p className="text-sm text-text-secondary">Require Discord membership and specific roles.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSyncServers}
                                    disabled={loadingGuilds}
                                    className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
                                >
                                    {loadingGuilds ? 'Syncing...' : 'Sync Servers'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    {loadingGuilds ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-4 w-24 bg-border-dark/60 rounded"></div>
                                            <div className="h-10 w-full bg-border-dark/60 rounded-xl"></div>
                                        </div>
                                    ) : guilds.length > 0 ? (
                                        <SearchableSelect
                                            label="Discord Server"
                                            options={guilds.map(g => ({
                                                value: g.id,
                                                label: g.name,
                                                icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null
                                            }))}
                                            value={form.discord_guild_id}
                                            onChange={(value) => handleGuildChange(value)}
                                            placeholder="Select a server..."
                                        />
                                    ) : (
                                        <>
                                            <Input
                                                label="Discord Guild ID"
                                                placeholder="e.g. 123456789012345678"
                                                required
                                                value={form.discord_guild_id}
                                                onChange={(e) => updateForm('discord_guild_id', e.target.value)}
                                            />
                                        </>
                                    )}
                                    {validationErrors.discord_guild_id && (
                                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                            <span className="material-icons text-[12px]">error</span>
                                            {validationErrors.discord_guild_id}
                                        </p>
                                    )}
                                </div>

                                {hasGuild && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-text-secondary">Required Roles</label>
                                        {loadingRoles ? (
                                            <div className="space-y-3 animate-pulse">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                                        <div key={i} className="flex items-center gap-2 p-2 rounded">
                                                            <div className="w-4 h-4 bg-border-dark/60 rounded"></div>
                                                            <div className="h-4 flex-1 bg-border-dark/60 rounded"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="h-3 w-3/4 bg-border-dark/60 rounded"></div>
                                            </div>
                                        ) : roles.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 rounded-lg border border-border-dark/60 bg-background-dark/50 custom-scrollbar">
                                                {roles.map((role) => {
                                                    const isSelected = form.required_role_ids.split(',').includes(role.id);
                                                    return (
                                                        <div
                                                            key={role.id}
                                                            onClick={() => toggleRole(role.id)}
                                                            className={`
                                                                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border
                                                                ${isSelected
                                                                    ? 'bg-primary/20 border-primary/50 text-white'
                                                                    : 'hover:bg-white/5 border-transparent text-text-secondary'}
                                                            `}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-500'}`}>
                                                                {isSelected && <span className="material-icons text-[10px] text-white">check</span>}
                                                            </div>
                                                            <span className="truncate text-sm" style={{ color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined }}>
                                                                {role.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase px-1">
                                                    <span className="flex-1">Role Name</span>
                                                    <span className="flex-1 ml-4">Role ID</span>
                                                    <span className="w-8"></span>
                                                </div>
                                                {manualRoles.map((role, index) => (
                                                    <div key={index} className="space-y-1">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 space-y-1">
                                                                <Input
                                                                    placeholder="e.g. Whitelist"
                                                                    value={role.name}
                                                                    onChange={(e) => updateManualRole(index, 'name', e.target.value)}
                                                                    className="py-2.5"
                                                                />
                                                                {validationErrors.manual_roles?.[index]?.name && (
                                                                    <p className="text-xs text-red-400 flex items-center gap-1 px-1">
                                                                        <span className="material-icons text-[10px]">error</span>
                                                                        {validationErrors.manual_roles[index].name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <Input
                                                                    placeholder="e.g. 123456789"
                                                                    value={role.id}
                                                                    onChange={(e) => updateManualRole(index, 'id', e.target.value)}
                                                                    className="py-2.5"
                                                                />
                                                                {validationErrors.manual_roles?.[index]?.id && (
                                                                    <p className="text-xs text-red-400 flex items-center gap-1 px-1">
                                                                        <span className="material-icons text-[10px]">error</span>
                                                                        {validationErrors.manual_roles[index].id}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeManualRole(index)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors self-start"
                                                                title="Remove Role"
                                                            >
                                                                <span className="material-icons text-lg">close</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addManualRole}
                                                    className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-1"
                                                >
                                                    <span className="material-icons text-sm">add</span>
                                                    Add Another Role
                                                </button>
                                            </div>
                                        )}
                                        {!loadingRoles && (
                                            <>
                                                <p className="text-xs text-text-secondary">
                                                    Users with <strong>any</strong> of these roles can claim (OR logic).
                                                </p>
                                                {validationErrors.required_role_ids && (
                                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                                        <span className="material-icons text-[12px]">error</span>
                                                        {validationErrors.required_role_ids}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                        {!loadingRoles && roleError && (
                                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                                {roleError === 'BOT_NOT_IN_GUILD' ? (
                                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                                                        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                                                            <span className="material-icons text-amber-500 text-sm">warning_amber</span>
                                                            <p className="text-sm font-bold text-amber-500">Bot is not in this server. See instruction below on how to set discord role requirements.</p>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-dark/40">
                                                            {/* Automate Column */}
                                                            <div className="p-4 space-y-4">
                                                                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                                                                    <span className="material-icons text-primary text-sm">auto_fix_high</span>
                                                                    Automate
                                                                </h4>
                                                                <ol className="text-xs text-text-secondary space-y-3 list-decimal list-inside">
                                                                    <li>
                                                                        <span className="text-text-primary">Add Daget.fun bot to your server</span>
                                                                        {botInviteLink && (
                                                                            <a
                                                                                href={botInviteLink}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="mt-2 block w-fit px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors shadow-none"
                                                                            >
                                                                                Invite Bot
                                                                            </a>
                                                                        )}
                                                                    </li>
                                                                    <li>
                                                                        Once the bot joins, click <span className="font-bold text-text-primary">Sync Roles</span> below.
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => fetchRoles(form.discord_guild_id)}
                                                                            disabled={loadingRoles}
                                                                            className="mt-2 block w-fit px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {loadingRoles ? 'Syncing...' : 'Sync Roles'}
                                                                        </button>
                                                                    </li>
                                                                </ol>
                                                            </div>

                                                            {/* Manual Column */}
                                                            <div className="p-4 space-y-4 bg-background-dark/30">
                                                                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                                                                    <span className="material-icons text-text-muted text-sm">edit_note</span>
                                                                    Manual
                                                                </h4>
                                                                <ol className="text-xs text-text-secondary space-y-3 list-decimal list-inside">
                                                                    <li>
                                                                        Enable Discord Developer Mode. <a href="https://help.mee6.xyz/support/solutions/articles/101000482629-how-to-enable-developer-mode" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">See how</a>.
                                                                    </li>
                                                                    <li>
                                                                        Right-click the specific role in your server settings and select <span className="font-bold text-text-primary">Copy ID</span>.
                                                                    </li>
                                                                    <li>
                                                                        Paste the Role ID and Name in the fields above.
                                                                    </li>
                                                                </ol>
                                                                <div className="mt-4 rounded-lg overflow-hidden border border-border-dark/40">
                                                                    <img
                                                                        src="/images/manual-role-guide.png"
                                                                        alt="How to copy Role ID in Discord"
                                                                        className="w-full h-auto"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 rounded bg-red-500/10 border border-red-500/20 space-y-2">
                                                        <p className="text-xs text-red-400 font-bold flex items-center gap-2">
                                                            <span className="material-icons text-sm">error_outline</span>
                                                            {roleError}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className={`space-y-6 pt-4 border-t border-border-dark/60 ${isRewardPoolDisabled ? 'opacity-70 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-primary">account_balance_wallet</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Reward Pool</h2>
                                    <p className="text-sm text-text-secondary">Configure how much and how many will win.</p>
                                </div>
                            </div>

                            <GlassCard className="p-6 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Amount</label>
                                        <div className="space-y-3">
                                            <div className={`flex gap-2 p-1 bg-background-dark/50 border rounded-xl transition-colors ${!form.token_symbol ? 'border-amber-500/40' : 'border-border-dark/60'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateForm('token_symbol', 'USDC')}
                                                    className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${form.token_symbol === 'USDC'
                                                        ? 'bg-primary text-white shadow-lg'
                                                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                                                        }`}
                                                >
                                                    USDC
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateForm('token_symbol', 'USDT')}
                                                    className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${form.token_symbol === 'USDT'
                                                        ? 'bg-primary text-white shadow-lg'
                                                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                                                        }`}
                                                >
                                                    USDT
                                                </button>
                                            </div>
                                            {!form.token_symbol && (
                                                <p className="text-xs text-amber-500 px-1 flex items-center gap-1">
                                                    <span className="material-icons text-[12px]">arrow_upward</span>
                                                    Please select a token
                                                </p>
                                            )}
                                            <input
                                                className="w-full bg-background-dark/50 border border-border-dark/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-right text-text-primary placeholder:text-text-secondary/50 outline-none"
                                                placeholder="0.00"
                                                type="text"
                                                inputMode="decimal"
                                                value={form.amount_display}
                                                onChange={(e) => updateForm('amount_display', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-text-muted px-1 uppercase tracking-tighter">
                                            <span>Balance: {currentBalance}</span>
                                            <button
                                                type="button"
                                                onClick={handleMaxClick}
                                                className="text-primary cursor-pointer hover:text-primary/80 transition-colors"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Winners</label>
                                        <input
                                            className="w-full bg-background-dark/50 border border-border-dark/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-text-primary placeholder:text-text-secondary/50 outline-none"
                                            type="number"
                                            min={1}
                                            max={100000}
                                            required
                                            placeholder="e.g. 50"
                                            value={form.total_winners}
                                            onChange={(e) => updateForm('total_winners', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Distribution Type</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => updateForm('daget_type', 'fixed')}
                                            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${form.daget_type === 'fixed' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border-dark/60 hover:border-primary/50'}`}
                                        >
                                            <span className={`material-icons mb-2 ${form.daget_type === 'fixed' ? 'text-primary' : 'text-text-muted'}`}>equalizer</span>
                                            <span className="font-bold text-sm">Fixed Amount</span>
                                            <span className="text-[11px] text-text-muted">Everyone gets equal share</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateForm('daget_type', 'random')}
                                            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${form.daget_type === 'random' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border-dark/60 hover:border-primary/50'}`}
                                        >
                                            <span className={`material-icons mb-2 ${form.daget_type === 'random' ? 'text-primary' : 'text-text-muted'}`}>casino</span>
                                            <span className="font-bold text-sm">Random/Weighted</span>
                                            <span className="text-[11px] text-text-muted">Lucky draw distribution</span>
                                        </button>
                                    </div>
                                </div>

                                {form.daget_type === 'random' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {RANDOM_PROFILES.map((profile) => {
                                                const isSelected =
                                                    parseFloat(form.random_min_percent) === profile.minPercent &&
                                                    parseFloat(form.random_max_percent) === profile.maxPercent;

                                                return (
                                                    <div
                                                        key={profile.id}
                                                        onClick={() => updateRandomProfile(profile.minPercent, profile.maxPercent)}
                                                        className={`
                                                            cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200
                                                            flex flex-col gap-3 group
                                                            ${isSelected
                                                                ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                                                                : 'border-border-dark/60 hover:border-primary/50 hover:bg-white/5'}
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary' : 'bg-background-dark/50 text-text-secondary group-hover:text-primary transition-colors'}`}>
                                                                <span className="material-icons text-xl">{profile.icon}</span>
                                                            </div>
                                                            {isSelected && (
                                                                <span className="material-icons text-primary animate-in zoom-in">check_circle</span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h4 className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                                                                {profile.name}
                                                            </h4>
                                                            <p className="text-xs text-text-muted font-mono mt-1">
                                                                {(profile.minPercent * 100).toFixed(0)} - {(profile.maxPercent * 100).toFixed(0)} bps
                                                            </p>
                                                        </div>

                                                        <div className="text-[11px] leading-relaxed text-text-secondary opacity-80">
                                                            {profile.description}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        </section>

                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="pt-8 mb-12">
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                loading={isSubmitting}
                                disabled={!canSubmit || isSubmitting}
                                className="w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {mode === 'create' ? (
                                    <>Create Daget <span className="material-icons">rocket_launch</span></>
                                ) : (
                                    <>Save Changes <span className="material-icons">save</span></>
                                )}
                            </Button>
                            {!canSubmit && form.token_symbol && (
                                <p className="text-center text-xs text-red-500 mt-4 font-semibold">
                                    Cannot save: Insufficient balance
                                </p>
                            )}
                            {mode === 'create' && canSubmit && (
                                <p className="text-center text-xs text-text-muted mt-4 italic">By clicking Create, you agree to Daget.fun Terms & Conditions and fees.</p>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="w-full lg:w-[380px] space-y-6">
                        <div className="sticky top-6">
                            <GlassCard className="rounded-xl overflow-hidden">
                                <div className="bg-primary/10 p-4 border-b border-primary/20">
                                    <h3 className="font-bold text-sm uppercase tracking-widest text-primary">Live Summary</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-xs text-text-muted w-[35%]">Estimated Claim per person</span>
                                            <div className="flex-1 text-right">
                                                <span className="font-bold text-base block leading-tight">{estimatedClaim} {form.token_symbol || ''}</span>
                                            </div>
                                        </div>
                                        <div className="h-px bg-border-dark/60"></div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-xs font-bold w-[35%]">Total to Fund</span>
                                                <div className="flex-1 text-right">
                                                    <span className="text-xl font-black text-primary block leading-tight break-all">{totalToFund} {form.token_symbol || ''}</span>
                                                </div>
                                            </div>
                                            {tokenBalanceCheck.message && (
                                                <div className={`text-[10px] font-semibold ${tokenBalanceCheck.color} text-right`}>
                                                    {tokenBalanceCheck.message}
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-px bg-border-dark/60"></div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-text-muted">Estimated Gas</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-lg">{estimatedGas} SOL</div>
                                                    <div className="text-[10px] text-green-500 font-semibold">≈ ${estimatedGasUsd}</div>
                                                </div>
                                            </div>
                                            {gasBalanceCheck.message && (
                                                <div className={`text-[10px] font-semibold ${gasBalanceCheck.color} text-right`}>
                                                    {gasBalanceCheck.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
                                        <span className="material-icons text-amber-500 text-xl">warning_amber</span>
                                        <div>
                                            <p className="text-xs font-bold text-amber-500 uppercase">SOL GAS NOTICE</p>
                                            <p className="text-[11px] text-amber-500/80 leading-relaxed mt-1">
                                                We recommend keeping at least 0.02 SOL in your wallet to cover rent, claim fees, and storage.
                                                <br /><br />
                                                <strong>Note:</strong> You may pay slightly more gas if the claimant address does not have an existing ATA for USDC/USDT.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[11px] font-bold text-text-muted uppercase">Gating Preview</p>
                                        {hasGuild ? (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background-dark/50">
                                                <span className="material-icons text-[#5865F2] text-sm">check_circle</span>
                                                <span className="text-xs">Discord Guild ID Set</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background-dark/50 opacity-50">
                                                <span className="material-icons text-text-muted text-sm">radio_button_unchecked</span>
                                                <span className="text-xs">Discord Guild Required</span>
                                            </div>
                                        )}
                                        {hasRoles ? (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background-dark/50">
                                                <span className="material-icons text-[#5865F2] text-sm">check_circle</span>
                                                <span className="text-xs">Role Verification Enabled</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background-dark/50 opacity-50">
                                                <span className="material-icons text-text-muted text-sm">radio_button_unchecked</span>
                                                <span className="text-xs">Role Verification Required</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>


                        </div>
                    </aside>
                </div>
            </form>
            <Modal
                isOpen={discordAuthError}
                onClose={() => setDiscordAuthError(false)}
                title="Discord Session Expired"
                message="Discord session is expired. Please sign in again."
                icon="login"
                iconColor="text-[#5865F2]"
                iconBg="bg-[#5865F2]/10"
                borderColor="border-[#5865F2]/20"
                primaryAction={{
                    label: 'Discord Sign in',
                    onClick: handleDiscordLogin,
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setDiscordAuthError(false),
                }}
            />
        </div>
    );
}
