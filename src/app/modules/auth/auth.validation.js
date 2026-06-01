import { z } from "zod";

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email is required",
      })
      .email("Please provide a valid email address"),

    password: z.string({
      required_error: "Password is required",
    }),
  }),
});

export const authValidation = {
  loginValidationSchema,
};
