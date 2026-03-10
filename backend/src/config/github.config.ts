import { registerAs } from '@nestjs/config';

export default registerAs('github', () => ({
  token: process.env.GITHUB_TOKEN || null,
}));