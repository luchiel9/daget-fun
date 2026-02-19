'use client';

import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import DagetForm, { FormValues } from '@/components/dagets/DagetForm';
import WalletBar from '@/components/WalletBar';

export default function CreateDagetPage() {
    const router = useRouter();

    const handleSubmit = async (values: FormValues) => {
        const roleIds = values.required_role_ids.split(',').map((s) => s.trim()).filter(Boolean);

        // Required roles logic was handled inside the form for display, but we need to construct the payload
        // The form passes back the raw values.
        // We need to reconstruct the roles objects if needed or just pass IDs?
        // The original code filtered roles from the `roles` state.
        // `DagetForm` doesn't pass back the full roles objects in `values` efficiently unless we add them to FormValues.
        // I added `required_roles` to FormValues interface in DagetForm.tsx but didn't populate it in handleSubmit of DagetForm.
        // Let's check DagetForm.tsx again.

        // In DagetForm.tsx, I just called `onSubmit(form)`.
        // `form` has `required_role_ids` string.
        // It does NOT have the full role objects unless I update `form.required_roles`.
        // The original `create/page.tsx` constructed `finalRoles` using `roles` state and `manualRoles` state.

        // Issue: logic for constructing `finalRoles` is inside `DagetForm` now (it has the `roles` and `manualRoles` state).
        // I should probably move the payload construction logic INTO `DagetForm` or expose the roles.
        // Or better yet, `DagetForm` should pass the constructed payload or formatted data to `onSubmit`.

        // If I look at `DagetForm.tsx` (which I just wrote), `handleSubmit` just calls `onSubmit(form)`.
        // references `form` state.
        // It does NOT construct `finalRoles`.

        // Implementation Detail: `DagetForm` should probably handle the "business logic" of formatting the data 
        // OR `DagetForm` should expose the roles so the parent can format it.
        // But `DagetForm` owns the `manualRoles` state now. Parents don't see it.
        // So `DagetForm` MUST construct the `finalRoles` array and pass it in the values.

        // I need to update `DagetForm.tsx` first to include `required_roles` (array of objects) in the submitted values.
        // The `FormValues` interface already has it as optional.

        // I will update `DagetForm.tsx` to construct `required_roles` before calling `onSubmit`

        // WAIT. I shouldn't rely on CreatePage to know about "manual roles" vs "discord roles".
        // That abstraction should be handled by DagetForm.

        // So I will update `DagetForm.tsx` first.
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <WalletBar />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <DagetForm
                        mode="create"
                        onSubmit={async (values) => {
                            const body: any = {
                                name: values.name,
                                message_html: values.message_html || undefined,
                                discord_guild_id: values.discord_guild_id,
                                discord_guild_name: values.discord_guild_name,
                                discord_guild_icon: values.discord_guild_icon,
                                required_role_ids: values.required_role_ids.split(',').map(s => s.trim()).filter(Boolean),
                                required_roles: values.required_roles, // Assuming DagetForm populates this
                                token_symbol: values.token_symbol,
                                amount_display: values.amount_display,
                                total_winners: parseInt(values.total_winners),
                                daget_type: values.daget_type,
                            };

                            if (values.daget_type === 'random') {
                                if (!values.random_min_percent || !values.random_max_percent) {
                                    // Should be caught by form validation, but double check
                                    throw new Error('Random distribution profile not selected');
                                }
                                body.random_min_percent = parseFloat(values.random_min_percent);
                                body.random_max_percent = parseFloat(values.random_max_percent);
                            } else {
                                body.random_min_percent = null;
                                body.random_max_percent = null;
                            }

                            const res = await fetch('/api/dagets', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Idempotency-Key': nanoid(),
                                },
                                body: JSON.stringify(body),
                            });

                            const data = await res.json();
                            if (!res.ok) {
                                throw new Error(data.error?.message || 'Failed to create Daget');
                            }

                            router.push(`/dagets/${data.daget_id}`);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
