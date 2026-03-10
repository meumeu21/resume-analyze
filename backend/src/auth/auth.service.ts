import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Profile, User } from '../database/entities';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Email уже занят');
    }

    const existingNickname = await this.profileRepo.findOne({ where: { nickname: dto.nickname } });
    if (existingNickname) {
      throw new ConflictException('Никнейм уже занят');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({ email: dto.email, passwordHash });
    await this.userRepo.save(user);

    const profile = this.profileRepo.create({ userId: user.id, nickname: dto.nickname });
    await this.profileRepo.save(profile);

    return this.buildTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.buildTokens(user);
  }

  async refresh(user: User) {
    return this.buildTokens(user);
  }

  private buildTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.config.getOrThrow('jwt.accessExpiresIn') as number,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.config.getOrThrow('jwt.refreshExpiresIn') as number,
    });

    return { accessToken, refreshToken };
  }
}
