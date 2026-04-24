import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  instituteName: string;

  /** URL-safe fragment; normalized server-side (lowercase, hyphenated). */
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  subdomain: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  recaptchaToken?: string;
}
