import jwt, { Secret, SignOptions } from 'jsonwebtoken';

import { PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  AuthCheckPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { TokenService } from './token.js';

export class AuthenticationService {
  prisma: PrismaClient;
  tokenService: TokenService;
  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
  }

  async login(payload: LoginPayload) {
    const { accessTokenSecret, accessTokenTtl } = config;

    const secret = accessTokenSecret as Secret;
    const signOptions: SignOptions = { expiresIn: accessTokenTtl as SignOptions['expiresIn'] };

    let user = null;
    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { email: payload.email.toLowerCase() },
        select: {
          email: true,
          name: true,
          id: true,
          password: true,
        },
      });
    } catch (err) {
      throw new Error('invalid credentials');
    }
    const isPasswordValid = await verifyPassword(payload.password, user.password as string);

    if (!isPasswordValid) {
      throw new Error('invalid credentials');
    }
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.email,
    };
    const accessToken = jwt.sign(tokenPayload, secret, signOptions);
    return {
      accessToken,
      user,
    };
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

    const hashedPassword = await hashPassword(payload.password);
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

  async changePassword(payload: ChangePasswordPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.password) {
      throw new Error('password_not_set');
    }

    const isValid = await verifyPassword(payload.currentPassword, user.password);
    if (!isValid) {
      throw new Error('invalid_current_password');
    }

    const hashedPassword = await hashPassword(payload.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.tokenService.revokeAllRefreshTokens(user.id);

    return { message: 'password_changed', forceLogout: true };
  }
}
