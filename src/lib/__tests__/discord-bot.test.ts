import { describe, it, expect, vi, beforeEach } from 'vitest';
import { htmlToDiscordText, buildRaffleEmbedData } from '../discord-bot';
import type { RaffleEmbedData } from '../discord-bot';

describe('htmlToDiscordText', () => {
  // Existing conversions (regression)
  it('converts <strong> to bold markdown', () => {
    expect(htmlToDiscordText('<strong>bold</strong>')).toBe('**bold**');
  });

  it('converts <em> to italic markdown', () => {
    expect(htmlToDiscordText('<em>italic</em>')).toBe('*italic*');
  });

  it('converts <br> to newlines', () => {
    expect(htmlToDiscordText('line1<br>line2')).toBe('line1\nline2');
  });

  it('converts <li> to bullet points', () => {
    expect(htmlToDiscordText('<ul><li>item1</li><li>item2</li></ul>')).toBe('• item1\n• item2');
  });

  // New: blockquote support
  it('converts <blockquote> to Discord blockquote syntax', () => {
    expect(htmlToDiscordText('<blockquote>quoted text</blockquote>')).toBe('> quoted text');
  });

  it('converts multiline blockquote with line breaks', () => {
    expect(htmlToDiscordText('<blockquote>line1<br>line2</blockquote>')).toBe('> line1\n> line2');
  });

  // New: inline code support
  it('converts <code> to inline code markdown', () => {
    expect(htmlToDiscordText('<code>inline code</code>')).toBe('`inline code`');
  });

  // New: code block support
  it('converts <pre> to code block markdown', () => {
    expect(htmlToDiscordText('<pre>code block</pre>')).toBe('```\ncode block\n```');
  });

  it('converts <pre><code> to code block markdown', () => {
    expect(htmlToDiscordText('<pre><code>code block</code></pre>')).toBe('```\ncode block\n```');
  });

  // Combined formatting
  it('handles mixed formatting in a message', () => {
    const html = '<p>this is <strong>raffle</strong> test</p><blockquote>quoted text</blockquote><p><code>code here</code></p>';
    const result = htmlToDiscordText(html);
    expect(result).toContain('this is **raffle** test');
    expect(result).toContain('> quoted text');
    expect(result).toContain('`code here`');
  });

  // Edge cases
  it('decodes HTML entities', () => {
    expect(htmlToDiscordText('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
  });

  it('collapses excessive newlines', () => {
    expect(htmlToDiscordText('a<br><br><br><br>b')).toBe('a\n\nb');
  });

  it('trims whitespace', () => {
    expect(htmlToDiscordText('  <p>hello</p>  ')).toBe('hello');
  });
});

// ─── Embed Image Tests ──────────────────────────────────────────────────────

// Mock env vars and fetch to test embed construction
const mockFetchResponse = (id = 'msg_123') =>
  Promise.resolve(new Response(JSON.stringify({ id }), { status: 200 }));

function makeEmbedData(overrides?: Partial<RaffleEmbedData>): RaffleEmbedData {
  return {
    dagetId: 'daget_1',
    name: 'Test Raffle',
    tokenSymbol: 'SOL',
    totalAmountDisplay: '1.0',
    totalWinners: 3,
    raffleEndsAt: new Date('2026-04-01T00:00:00Z'),
    claimSlug: 'test-slug',
    creatorDiscordUserId: '12345',
    ...overrides,
  };
}

describe('postRaffleEmbed', () => {
  let capturedBody: Record<string, unknown>;

  beforeEach(() => {
    vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token');
    vi.stubEnv('DISCORD_CLIENT_ID', 'test-app-id');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://daget.fun');
    capturedBody = {};
    vi.stubGlobal('fetch', async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return mockFetchResponse();
    });
  });

  it('includes image in embed when imageUrl is provided', async () => {
    const { postRaffleEmbed } = await import('../discord-bot');
    await postRaffleEmbed('channel_1', makeEmbedData({ imageUrl: 'https://example.com/nft.png' }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    expect(embed.image).toEqual({ url: 'https://example.com/nft.png' });
  });

  it('omits image from embed when imageUrl is not provided', async () => {
    const { postRaffleEmbed } = await import('../discord-bot');
    await postRaffleEmbed('channel_1', makeEmbedData());
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    expect(embed.image).toBeUndefined();
  });
});

describe('updateRaffleEmbed', () => {
  let capturedBody: Record<string, unknown>;

  beforeEach(() => {
    vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token');
    vi.stubEnv('DISCORD_CLIENT_ID', 'test-app-id');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://daget.fun');
    capturedBody = {};
    vi.stubGlobal('fetch', async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return mockFetchResponse();
    });
  });

  it('includes image in embed when imageUrl is provided', async () => {
    const { updateRaffleEmbed } = await import('../discord-bot');
    await updateRaffleEmbed('channel_1', 'msg_1', makeEmbedData({ imageUrl: 'https://example.com/nft.png' }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    expect(embed.image).toEqual({ url: 'https://example.com/nft.png' });
  });

  it('omits image from embed when imageUrl is not provided', async () => {
    const { updateRaffleEmbed } = await import('../discord-bot');
    await updateRaffleEmbed('channel_1', 'msg_1', makeEmbedData());
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    expect(embed.image).toBeUndefined();
  });
});

// ─── buildRaffleEmbedData Tests ─────────────────────────────────────────────

describe('buildRaffleEmbedData', () => {
  const baseDaget = {
    id: 'daget_abc',
    name: 'My Raffle',
    tokenSymbol: 'SOL',
    tokenDecimals: 9,
    totalAmountBaseUnits: 1_000_000_000, // 1.0 SOL
    totalWinners: 5,
    raffleEndsAt: new Date('2026-05-01T12:00:00Z'),
    claimedCount: 3,
    messageHtml: '<strong>hello</strong>',
    claimSlug: 'my-raffle-slug',
    imageUrl: 'https://example.com/image.png',
  };

  it('maps daget fields to RaffleEmbedData', () => {
    const result = buildRaffleEmbedData(baseDaget, '99999');
    expect(result).toEqual({
      dagetId: 'daget_abc',
      name: 'My Raffle',
      tokenSymbol: 'SOL',
      totalAmountDisplay: '1',
      totalWinners: 5,
      raffleEndsAt: baseDaget.raffleEndsAt,
      entryCount: 3,
      messageHtml: '<strong>hello</strong>',
      claimSlug: 'my-raffle-slug',
      creatorDiscordUserId: '99999',
      imageUrl: 'https://example.com/image.png',
    });
  });

  it('handles null optional fields', () => {
    const result = buildRaffleEmbedData({
      ...baseDaget,
      raffleEndsAt: null,
      messageHtml: null,
      imageUrl: null,
    }, null);
    expect(result.raffleEndsAt).toBeNull();
    expect(result.messageHtml).toBeNull();
    expect(result.creatorDiscordUserId).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it('formats display amount correctly for different decimals', () => {
    // USDC with 6 decimals: 5_500_000 = 5.5
    const result = buildRaffleEmbedData({
      ...baseDaget,
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      totalAmountBaseUnits: 5_500_000,
    }, null);
    expect(result.totalAmountDisplay).toBe('5.5');
  });

  it('preserves trailing zeros for whole amounts', () => {
    const result = buildRaffleEmbedData({
      ...baseDaget,
      totalAmountBaseUnits: 2_000_000_000, // 2.0 SOL
    }, null);
    expect(result.totalAmountDisplay).toBe('2');
  });

  // Fix #6: Float display — no floating-point noise
  it('avoids floating-point artifacts for fractional amounts', () => {
    // 0.1 + 0.2 problem: 100_000_001 / 1e9 naively = '0.100000001' (ok)
    // but 3_300_000 / 1e6 = 3.3 (ok). Edge: 1_000_000_000_000_001 / 1e9
    // exceeds safe int — but schema enforces max safe int so let's test a known edge:
    // 100_003 / 1e6 = 0.100003 (should be clean)
    const result = buildRaffleEmbedData({
      ...baseDaget,
      tokenDecimals: 6,
      totalAmountBaseUnits: 100_003,
    }, null);
    expect(result.totalAmountDisplay).toBe('0.100003');
    // No trailing noise digits
    expect(result.totalAmountDisplay).not.toMatch(/\d{7,}$/);
  });

  it('does not produce trailing zeros for clean fractions', () => {
    // 500_000 / 1e6 = 0.5 — should NOT be "0.500000"
    const result = buildRaffleEmbedData({
      ...baseDaget,
      tokenDecimals: 6,
      totalAmountBaseUnits: 500_000,
    }, null);
    expect(result.totalAmountDisplay).toBe('0.5');
  });
});

// ─── Embed Description Truncation Tests ─────────────────────────────────────

describe('postRaffleEmbed description truncation', () => {
  let capturedBody: Record<string, unknown>;

  beforeEach(() => {
    vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token');
    vi.stubEnv('DISCORD_CLIENT_ID', 'test-app-id');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://daget.fun');
    capturedBody = {};
    vi.stubGlobal('fetch', async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return Promise.resolve(new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 }));
    });
  });

  it('truncates description to at most 4096 characters', async () => {
    const { postRaffleEmbed } = await import('../discord-bot');
    // Create a message that will exceed 4096 chars after conversion
    const longHtml = '<p>' + 'A'.repeat(5000) + '</p>';
    await postRaffleEmbed('ch_1', makeEmbedData({ messageHtml: longHtml }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    const description = embed.description as string;
    expect(description.length).toBeLessThanOrEqual(4096);
  });

  it('appends ellipsis when truncated', async () => {
    const { postRaffleEmbed } = await import('../discord-bot');
    const longHtml = '<p>' + 'B'.repeat(5000) + '</p>';
    await postRaffleEmbed('ch_1', makeEmbedData({ messageHtml: longHtml }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    const description = embed.description as string;
    expect(description).toMatch(/…$/);
  });

  it('does not truncate descriptions under 4096 chars', async () => {
    const { postRaffleEmbed } = await import('../discord-bot');
    const shortHtml = '<p>Short message</p>';
    await postRaffleEmbed('ch_1', makeEmbedData({ messageHtml: shortHtml }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    const description = embed.description as string;
    expect(description).not.toMatch(/…$/);
    expect(description).toContain('Short message');
  });
});

describe('updateRaffleEmbed description truncation', () => {
  let capturedBody: Record<string, unknown>;

  beforeEach(() => {
    vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token');
    vi.stubEnv('DISCORD_CLIENT_ID', 'test-app-id');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://daget.fun');
    capturedBody = {};
    vi.stubGlobal('fetch', async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return Promise.resolve(new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 }));
    });
  });

  it('truncates description to at most 4096 characters', async () => {
    const { updateRaffleEmbed } = await import('../discord-bot');
    const longHtml = '<p>' + 'C'.repeat(5000) + '</p>';
    await updateRaffleEmbed('ch_1', 'msg_1', makeEmbedData({ messageHtml: longHtml }));
    const embed = (capturedBody.embeds as Array<Record<string, unknown>>)[0];
    const description = embed.description as string;
    expect(description.length).toBeLessThanOrEqual(4096);
  });
});
