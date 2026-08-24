import { PrismaClient, UserStatus } from '@saas-boilerplate/types';

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
  // account only when the provider asserts emailVerified, or creates a new user —
  // but never issues tokens here. Tokens are only minted at exchange-code consumption.
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
        if (!profile.emailVerified) {
          throw new Error('oauth_email_unverified');
        }
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

  /**
   * Attach a provider to an already-authenticated user (logged-in link flow).
   */
  async linkOAuthProvider(
    userId: string,
    provider: OAuthProviderName,
    profile: OAuthProfilePayload,
  ) {
    if (!profile.emailVerified) {
      throw new Error('oauth_email_unverified');
    }

    const providerIdWhere =
      provider === 'google' ? { google_id: profile.id } : { linkedin_id: profile.id };

    const existingByProvider = await this.prisma.user.findUnique({ where: providerIdWhere });
    if (existingByProvider && existingByProvider.id !== userId) {
      throw new Error('oauth_link_conflict');
    }
    if (existingByProvider?.id === userId) {
      return existingByProvider;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('user_not_found');
    }

    const profileEmail = profile.email ? profile.email.toLowerCase() : null;
    if (user.email && profileEmail && user.email.toLowerCase() !== profileEmail) {
      throw new Error('oauth_link_email_mismatch');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email_verified: true,
        ...(profileEmail && !user.email ? { email: profileEmail } : {}),
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

    // The exchange code can only exist for a user who already completed a real OAuth
    // handshake with the provider — reaching this point already proves the caller owns
    // that identity, so surfacing a moderation status specifically here can't be used to
    // enumerate banned/inactive accounts (same reasoning as the phone login gate).
    if (user.status === UserStatus.BANNED) {
      throw new Error('account_banned');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new Error('account_inactive');
    }

    const tokens = await this.tokenService.issueTokenPair(user);

    return {
      ...tokens,
      user: toMemberSessionUser(user),
    };
  }
}
