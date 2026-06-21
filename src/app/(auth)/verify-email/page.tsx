"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setError("Missing token"); return; }
    api.post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch((err) => { setState("error"); setError(apiErrorMessage(err)); });
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Email verification</CardTitle></CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        {state === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
        {state === "ok" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p>Your email is verified and your workspace is ready.</p>
            <Link href="/login"><Button>Sign in</Button></Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/login"><Button variant="outline">Back to sign in</Button></Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={null}><VerifyInner /></Suspense>
    </div>
  );
}
