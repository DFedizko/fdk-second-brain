import { z } from "zod";

export const TOKEN_REPLY = z.object({ access_token: z.string().min(1) });

export const USER_REPLY = z.object({ login: z.string().min(1), id: z.number().int().positive() });
