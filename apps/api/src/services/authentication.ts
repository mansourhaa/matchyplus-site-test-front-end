import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

import { PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { isAdminRole } from '../constants.js';
import {
  AuthCheckPayload,
  AuthCheckResult,
  ForgotPayload,
  ForgotResult,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  ResetPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';

function parseTokenTtl(ttl: string): SignOptions['expiresIn'] {
  return /^\d+$/.test(ttl) ? Number(ttl) : (ttl as SignOptions['expiresIn']);
}

export class AuthenticationService {
  prisma: PrismaClient;
  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async login(payload: LoginPayload) {
    const { accessTokenSecret, accessTokenTtl } = config;

    const secret = accessTokenSecret as Secret;
    // ACCESS_TOKEN_TTL is either a raw seconds count or a jsonwebtoken timespan such as '1d'.
    const signOptions: SignOptions = { expiresIn: parseTokenTtl(accessTokenTtl) };

    let user = null;
    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { email: payload.email.toLowerCase() },
        select: {
          email: true,
          name: true,
          id: true,
          password: true,
          role: true,
        },
      });
    } catch (err) {
      throw new Error('invalid credentials');
    }
    const isPasswordValid = await this.validatePassword(payload.password, user.password as string);

    if (!isPasswordValid) {
      throw new Error('invalid credentials');
    }
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.email,
      role: user.role,
    };
    const accessToken = jwt.sign(tokenPayload, secret, signOptions);
    return {
      accessToken,
      user,
    };
  }

  /**
   * Authenticates against the admin panel. Non-admin accounts are rejected with the
   * same error as bad credentials so the endpoint cannot be used to enumerate roles.
   */
  async adminLogin(payload: LoginPayload) {
    const data = await this.login(payload);

    if (!isAdminRole(data.user.role)) {
      throw new Error('invalid credentials');
    }

    return data;
  }

  async register(payload: RegisterPayload) {
    let user = null;
    user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: {
        email: true,
        id: true,
        password: true,
      },
    });
    if (user) {
      throw new Error('user already exist');
    }

    const hashedPassword = await this.hashPassword(payload.password);
    user = await this.prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        name: payload.email,
      },
    });
    return user;
  }

  async authCheck(payload: AuthCheckPayload) {
    let user = null;

    console.log(payload);
    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { id: payload.id },
        select: {
          email: true,
          id: true,
        },
      });
    } catch (err) {
      throw new Error('Not Found');
    }
    return user;
  }
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  }
  private async validatePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
