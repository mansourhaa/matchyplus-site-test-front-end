import { PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { generateExchangeCode, hashExchangeCode } from '../lib/oauth-exchange-code.js';
import { OAuthExchangePayload, OAuthProfilePayload, OAuthProviderName } from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { toMemberSessionUser } from '../utils/session-user.js';
import { TokenService } from './token.js';

export class OAuthAuthenticationService {
  prisma: PrismaClient;
  tokenService: TokenService;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
  }

  // Finds the user for this provider identity, links the provider to an existing
  // verified-email account, or creates a new user — but never issues tokens here.
  // Tokens are only ever minted at exchange-code consumption time (see below).
  async findOrCreateOAuthUser(provider: OAuthProviderName, profile: OAuthProfilePayload) {
    const providerIdWhere =
      provider === 'google' ? { google_id: profile.id } : { linkedin_id: profile.id };

    const existingByProvider = await this.prisma.user.findUnique({ where: providerIdWhere });
    if (existingByProvider) {
      return existingByProvider;
    }

    const email = profile.email ? profile.email.toLowerCase() : null;

    if (email) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // Email is OAuth-only in this app (see doc/features/authentication.md) — every
        // provider that returns this address has already verified it on its own side, so an
        // unverified flag on our side (e.g. a stale value from before this account linked a
        // provider) is never a reason to refuse the merge.
        return this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            email_verified: true,
            ...(provider === 'google' ? { google_id: profile.id } : { linkedin_id: profile.id }),
          },
        });
      }
    }

    return this.prisma.user.create({
      data: {
        email,
        email_verified: profile.emailVerified,
        name: profile.name ?? profile.email ?? `${provider}-${profile.id}`,
        auth_provider: provider,
        ...(provider === 'google' ? { google_id: profile.id } : { linkedin_id: profile.id }),
      },
    });
  }

  async createExchangeCode(userId: string): Promise<string> {
    const code = generateExchangeCode();
    const expiresAt = new Date(Date.now() + config.oauthExchangeCodeTtlSeconds * 1000);

    await this.prisma.oAuthExchangeCode.create({
      data: {
        code_hash: hashExchangeCode(code),
        user_id: userId,
        expires_at: expiresAt,
      },
    });

    return code;
  }

  // The only place a token pair is minted for an OAuth login — deliberately not done
  // during the callback, so a code that's never consumed never has live tokens tied to it.
  async consumeExchangeCode(payload: OAuthExchangePayload) {
    const codeHash = hashExchangeCode(payload.code);
    const now = new Date();

    const record = await this.prisma.oAuthExchangeCode.findUnique({
      where: {
        code_hash: codeHash,
      },
    });

    if (!record) {
      throw new Error('invalid_exchange_code');
    }

    const consumed = await this.prisma.oAuthExchangeCode.updateMany({
      where: {
        id: record.id,
        consumed_at: null,
        expires_at: {
          gt: now,
        },
      },
      data: {
        consumed_at: now,
      },
    });

    if (consumed.count !== 1) {
      throw new Error('invalid_exchange_code');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: record.user_id,
      },
    });

    const tokens = await this.tokenService.issueTokenPair(user);

    return {
      ...tokens,
      user: toMemberSessionUser(user),
    };
  }
}
