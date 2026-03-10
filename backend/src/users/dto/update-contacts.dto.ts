import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum,
  IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { ContactLinkType } from '../../database/entities';

class ContactLinkDto {
  @IsEnum(ContactLinkType)
  type: ContactLinkType;

  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactLinkDto)
  contacts: ContactLinkDto[];
}
