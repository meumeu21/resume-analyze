import {
  IsArray, IsBoolean, IsInt, IsNumber, IsObject,
  IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HardSkillDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  level!: number;
}

export class CoordinatesDto {
  @IsNumber()
  @Min(-5)
  @Max(5)
  x!: number;

  @IsNumber()
  @Min(-5)
  @Max(5)
  y!: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'nickname может содержать только буквы, цифры, _ и -' })
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  softSkills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HardSkillDto)
  hardSkills?: HardSkillDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isFollowersPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isFollowingPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavoritesPublic?: boolean;
}
