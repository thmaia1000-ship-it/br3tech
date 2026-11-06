import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Se for execução de SSR no servidor (Node), não bloqueia aqui; a validação da sessão ocorre no browser
    if (typeof window === "undefined") {
      return { user: null };
    }

    // Checa sessão local rápida no browser
    const { data: sessData } = await supabase.auth.getSession();
    if (sessData?.session?.user) {
      return { user: sessData.session.user };
    }

    // Validate the saved session with the auth service instead of trusting a stale token.
    let { data, error } = await supabase.auth.getUser();

    // The preview session can arrive asynchronously through the storage broker.
    if (error || !data?.user) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const retry = await supabase.auth.getUser();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data?.user) {
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
