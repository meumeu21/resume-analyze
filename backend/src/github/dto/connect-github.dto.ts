import { IsString, Matches, MaxLength } from 'class-validator';

export class ConnectGithubDto {
  @IsString()
  @MaxLength(39)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, {
    message: 'Некорректный GitHub username',
  })
  username: string;
}