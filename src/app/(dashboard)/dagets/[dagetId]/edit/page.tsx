'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTokenConfig } from '@/lib/tokens';
import DagetForm, { FormValues } from '@/components/dagets/DagetForm';
import WalletBar from '@/components/WalletBar';

export default function EditDagetPage() {
    const router = useRouter();
    const params = useParams();
    const dagetId = params.dagetId as string;

    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [originalDaget, setOriginalDaget] = useState<any>(null);
    const [initialValues, setInitialValues] = useState<Partial<FormValues>>({});

    // Fetch Daget Details
    useEffect(() => {
        const fetchData = async () => {
            try {
                const resDaget = await fetch(`/api/dagets/${dagetId}`);
                if (!resDaget.ok) throw new Error('Failed to fetch Daget');
                const daget = await resDaget.json();
                setOriginalDaget(daget);

                // Pre-fill form
                const tokenConfig = getTokenConfig(daget.token_symbol);
                const amountDisplay = (daget.total_amount_base_units / Math.pow(10, tokenConfig.decimals)).toString();

                let minPct = '';
                let maxPct = '';
                if (daget.daget_type === 'random' && daget.random_min_bps && daget.random_max_bps) {
                    minPct = (daget.random_min_bps / 100).toString();
                    maxPct = (daget.random_max_bps / 100).toString();
                }

                setInitialValues({
                    name: daget.name,
                    message_html: daget.message_html || '',
                    discord_guild_id: daget.discord_guild_id || '',
                    discord_guild_name: daget.discord_guild_name || '',
                    discord_guild_icon: daget.discord_guild_icon || null,
                    required_role_ids: daget.requirements.map((r: any) => r.id).join(','),
                    required_roles: daget.requirements,
                    token_symbol: daget.token_symbol,
                    amount_display: amountDisplay,
                    total_winners: daget.total_winners.toString(),
                    daget_type: daget.daget_type,
                    random_min_percent: minPct,
                    random_max_percent: maxPct,
                });

            } catch (err) {
                console.error(err);
                setError('Failed to load Daget details');
            } finally {
                setInitialLoading(false);
            }
        };
        fetchData();
    }, [dagetId]);

    const handleSubmit = async (values: FormValues) => {
        const roleIds = values.required_role_ids.split(',').map(s => s.trim()).filter(Boolean);

        // Filter out fields that cannot be edited if claims exist
        const hasClaims = originalDaget?.claimed_count > 0;

        const body: any = {
            name: values.name,
            message_html: values.message_html || undefined,
            discord_guild_id: values.discord_guild_id,
            discord_guild_name: values.discord_guild_name,
            discord_guild_icon: values.discord_guild_icon,
            required_role_ids: roleIds,
            required_roles: values.required_roles
                ? values.required_roles
                    .filter(r => roleIds.includes(r.id))
                    .map(r => ({ id: r.id, name: r.name, color: r.color }))
                : [], // Should be populated by DagetForm
        };

        if (!hasClaims) {
            body.token_symbol = values.token_symbol;
            body.amount_display = values.amount_display;
            body.total_winners = parseInt(values.total_winners);
            body.daget_type = values.daget_type;
            if (values.daget_type === 'random') {
                if (!values.random_min_percent || !values.random_max_percent) {
                    throw new Error('Random distribution profile not selected');
                }
                body.random_min_percent = parseFloat(values.random_min_percent);
                body.random_max_percent = parseFloat(values.random_max_percent);
            } else {
                body.random_min_percent = null;
                body.random_max_percent = null;
            }
        }

        const res = await fetch(`/api/dagets/${dagetId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to update Daget');
        }

        router.push(`/dagets/${dagetId}`);
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-primary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
            </div>
        );
    }

    if (!originalDaget) return <div>Daget not found</div>;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <WalletBar />

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <DagetForm
                        mode="edit"
                        initialValues={initialValues}
                        claimsCount={originalDaget.claimed_count}
                        onSubmit={handleSubmit}
                        error={error}
                    />
                </div>
            </div>
        </div>
    );
}
