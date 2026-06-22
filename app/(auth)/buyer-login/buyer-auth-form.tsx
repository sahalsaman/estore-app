"use client";

import { useActionState, useState } from "react";
import {
  buyerLoginAction,
  buyerRegisterAction,
  type BuyerAuthState,
} from "@/actions/buyer-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function BuyerAuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-md bg-muted p-1 text-sm">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded px-3 py-1.5 font-medium transition-colors",
              mode === m ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      {mode === "login" ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState<BuyerAuthState, FormData>(buyerLoginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="phone" label="Mobile number" placeholder="9876543210" autoComplete="username" state={state} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" state={state} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [state, action, pending] = useActionState<BuyerAuthState, FormData>(buyerRegisterAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Your name" placeholder="Ravi Kumar" autoComplete="name" state={state} />
      <Field name="phone" label="Mobile number" placeholder="9876543210" autoComplete="tel" state={state} />
      <Field name="password" label="Password" type="password" autoComplete="new-password" state={state} />
      <Field name="address" label="Address (optional)" placeholder="Shop / delivery address" state={state} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  state,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  state: BuyerAuthState;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} />
      {state?.fieldErrors?.[name] && (
        <p className="text-sm text-destructive">{state.fieldErrors[name][0]}</p>
      )}
    </div>
  );
}
